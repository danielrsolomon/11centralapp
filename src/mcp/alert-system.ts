import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import chalk from 'chalk';

// Configuration
const config = {
  mcpUrl: 'http://localhost:3100',
  pgConfig: {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432'),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'postgres',
  },
  alertsDirectory: path.join(__dirname, 'alerts'),
  alertThresholds: {
    slowQueryMs: 500, // Consider queries slower than 500ms as slow
    securityRlsMissingThreshold: 1, // Alert if any table is missing RLS
    archiveDataThresholdRows: 10000, // Alert when tables exceed this size (consider archiving)
    connectionThreshold: 30, // Alert when connection count exceeds this number
    diskUsagePercent: 80, // Alert when disk usage exceeds this percentage
  },
  notificationChannels: {
    logToFile: true,
    sendEmail: false, // Not implemented, configure as needed
    webhookUrl: '', // Optional webhook URL for external notification system
    consoleOutput: true,
  },
  alertIntervalMinutes: 15, // How often to check for alerts
};

// Ensure alerts directory exists
if (!fs.existsSync(config.alertsDirectory)) {
  fs.mkdirSync(config.alertsDirectory, { recursive: true });
}

// Alert types
interface Alert {
  id: string;
  type: 'performance' | 'security' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: string;
  acknowledged: boolean;
  resolvedAt?: string;
}

// Logger utility
const logger = {
  info: (message: string) => console.log(chalk.blue(`[INFO] ${message}`)),
  success: (message: string) => console.log(chalk.green(`[SUCCESS] ${message}`)),
  warning: (message: string) => console.log(chalk.yellow(`[WARNING] ${message}`)),
  error: (message: string) => console.log(chalk.red(`[ERROR] ${message}`)),
  alert: (message: string, severity: string) => {
    const color = severity === 'critical' ? chalk.bgRed.white : 
                 severity === 'high' ? chalk.red : 
                 severity === 'medium' ? chalk.yellow : 
                 chalk.blue;
    console.log(color(`[ALERT-${severity.toUpperCase()}] ${message}`));
  }
};

// Database client
let client: Client;

// Helper function to connect to the database
async function connectToDb() {
  if (client && client.connected) {
    return client;
  }
  
  client = new Client(config.pgConfig);
  await client.connect();
  return client;
}

// Helper function to disconnect from the database
async function disconnectFromDb() {
  if (client && client.connected) {
    await client.end();
  }
}

// Helper function to execute SQL queries
async function executeSql(query: string, params: any[] = []) {
  const db = await connectToDb();
  try {
    return await db.query(query, params);
  } catch (error) {
    logger.error(`SQL Error: ${error.message}`);
    throw error;
  }
}

// Helper function to make RPC calls to the MCP server
async function callRpc(name: string, args: any = {}) {
  try {
    const response = await axios.post(config.mcpUrl, {
      method: 'rpc.methodCall',
      params: {
        name,
        args
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return error.response.data;
    }
    throw error;
  }
}

// Save alert to a file
function saveAlert(alert: Alert) {
  const alertFilePath = path.join(
    config.alertsDirectory, 
    `${alert.type}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  
  fs.writeFileSync(alertFilePath, JSON.stringify(alert, null, 2));
  logger.info(`Alert saved to ${alertFilePath}`);
  
  // Also log to console if configured
  if (config.notificationChannels.consoleOutput) {
    logger.alert(alert.message, alert.severity);
  }
  
  // Send webhook if configured
  if (config.notificationChannels.webhookUrl) {
    sendWebhookNotification(alert).catch(err => {
      logger.error(`Failed to send webhook notification: ${err.message}`);
    });
  }
}

// Send webhook notification
async function sendWebhookNotification(alert: Alert) {
  if (!config.notificationChannels.webhookUrl) {
    return;
  }
  
  try {
    await axios.post(config.notificationChannels.webhookUrl, alert);
    logger.info(`Webhook notification sent for alert ${alert.id}`);
  } catch (error) {
    logger.error(`Failed to send webhook: ${error.message}`);
  }
}

// Check for slow queries
async function checkSlowQueries(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  
  try {
    const result = await executeSql(`
      SELECT 
        query,
        calls,
        total_time / calls as avg_time,
        max_time,
        substring(query, '^\s*(\w+)') as query_type
      FROM pg_stat_statements
      WHERE total_time / calls > $1
      AND query NOT LIKE '%pg_stat_statements%'
      ORDER BY total_time / calls DESC
      LIMIT 10
    `, [config.alertThresholds.slowQueryMs]);
    
    for (const row of result.rows) {
      const queryTime = parseFloat(row.avg_time);
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      
      if (queryTime > 5000) {
        severity = 'critical';
      } else if (queryTime > 2000) {
        severity = 'high';
      } else if (queryTime > 1000) {
        severity = 'medium';
      }
      
      alerts.push({
        id: `slow-query-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: 'performance',
        severity,
        message: `Slow query detected: ${row.query_type || 'SQL'} query taking ${Math.round(queryTime)}ms on average`,
        details: {
          query: row.query.substring(0, 200) + (row.query.length > 200 ? '...' : ''),
          avgTime: queryTime,
          maxTime: parseFloat(row.max_time),
          calls: parseInt(row.calls),
          queryType: row.query_type
        },
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }
  } catch (error) {
    logger.error(`Error checking slow queries: ${error.message}`);
  }
  
  return alerts;
}

// Check for tables missing RLS
async function checkRlsSecurity(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  
  try {
    // Query tables without RLS
    const rpcResult = await callRpc('execute_sql', {
      query: `
        SELECT * FROM identify_tables_without_rls()
        WHERE has_rls = false
        AND table_name NOT LIKE 'pg_%'
      `
    });
    
    if (rpcResult && rpcResult.result && rpcResult.result.rows) {
      const tablesWithoutRls = rpcResult.result.rows;
      
      if (tablesWithoutRls.length > 0) {
        const tablesList = tablesWithoutRls.map(t => t.table_name).join(', ');
        
        alerts.push({
          id: `rls-missing-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'security',
          severity: 'high',
          message: `${tablesWithoutRls.length} tables found without Row Level Security enabled`,
          details: {
            tables: tablesWithoutRls,
            issueType: 'missing-rls',
            suggestedFix: 'Run security-review.sql with fix_issues=true'
          },
          timestamp: new Date().toISOString(),
          acknowledged: false
        });
      }
    }
    
    // Query sensitive tables with insufficient policies
    const sensitivePoliciesResult = await callRpc('execute_sql', {
      query: `
        SELECT * FROM identify_sensitive_tables_without_policies()
        WHERE policy_count < 3
      `
    });
    
    if (sensitivePoliciesResult && sensitivePoliciesResult.result && sensitivePoliciesResult.result.rows) {
      const tablesWithoutPolicies = sensitivePoliciesResult.result.rows;
      
      if (tablesWithoutPolicies.length > 0) {
        const tablesList = tablesWithoutPolicies.map(t => t.table_name).join(', ');
        
        alerts.push({
          id: `insufficient-policies-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'security',
          severity: 'high',
          message: `${tablesWithoutPolicies.length} sensitive tables have insufficient RLS policies`,
          details: {
            tables: tablesWithoutPolicies,
            issueType: 'insufficient-policies',
            suggestedFix: 'Run security-review.sql with fix_issues=true'
          },
          timestamp: new Date().toISOString(),
          acknowledged: false
        });
      }
    }
  } catch (error) {
    logger.error(`Error checking RLS security: ${error.message}`);
  }
  
  return alerts;
}

// Check for tables that need archiving
async function checkTablesForArchiving(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  
  try {
    const result = await executeSql(`
      SELECT
        relname as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) as size
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      AND n_live_tup > $1
      ORDER BY n_live_tup DESC
      LIMIT 5
    `, [config.alertThresholds.archiveDataThresholdRows]);
    
    for (const row of result.rows) {
      let severity: 'low' | 'medium' | 'high' = 'low';
      const rowCount = parseInt(row.row_count);
      
      if (rowCount > 100000) {
        severity = 'medium';
      } else if (rowCount > 500000) {
        severity = 'high';
      }
      
      // Check if this table already has an archive policy
      const archivePolicyResult = await callRpc('execute_sql', {
        query: `
          SELECT EXISTS (
            SELECT 1 FROM archive_policies
            WHERE source_table = $1
          ) as has_policy
        `,
        params: [row.table_name]
      });
      
      const hasPolicy = archivePolicyResult?.result?.rows?.[0]?.has_policy || false;
      
      if (!hasPolicy) {
        alerts.push({
          id: `large-table-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'performance',
          severity,
          message: `Large table detected: ${row.table_name} with ${rowCount.toLocaleString()} rows (${row.size})`,
          details: {
            table: row.table_name,
            rowCount,
            size: row.size,
            hasArchivePolicy: hasPolicy,
            suggestedFix: `Create an archive policy for ${row.table_name}`
          },
          timestamp: new Date().toISOString(),
          acknowledged: false
        });
      }
    }
  } catch (error) {
    logger.error(`Error checking tables for archiving: ${error.message}`);
  }
  
  return alerts;
}

// Check for system status issues
async function checkSystemStatus(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  
  try {
    // Check active connections
    const connectionsResult = await executeSql(`
      SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()
    `);
    
    const connectionCount = parseInt(connectionsResult.rows[0].count);
    if (connectionCount > config.alertThresholds.connectionThreshold) {
      alerts.push({
        id: `high-connections-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: 'system',
        severity: connectionCount > config.alertThresholds.connectionThreshold * 2 ? 'high' : 'medium',
        message: `High number of database connections: ${connectionCount}`,
        details: {
          connectionCount,
          threshold: config.alertThresholds.connectionThreshold,
          suggestedFix: 'Consider implementing connection pooling or investigate connection leaks'
        },
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }
    
    // Check database size growth
    const sizeResult = await executeSql(`
      SELECT pg_database_size(current_database()) as size
    `);
    
    const dbSizeBytes = parseInt(sizeResult.rows[0].size);
    const dbSizeMB = dbSizeBytes / (1024 * 1024);
    const dbSizeGB = dbSizeMB / 1024;
    
    if (dbSizeGB > 5) {
      alerts.push({
        id: `large-database-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: 'system',
        severity: dbSizeGB > 20 ? 'high' : dbSizeGB > 10 ? 'medium' : 'low',
        message: `Database size is large: ${Math.round(dbSizeGB * 100) / 100} GB`,
        details: {
          sizeBytes: dbSizeBytes,
          sizeMB: Math.round(dbSizeMB),
          sizeGB: Math.round(dbSizeGB * 100) / 100,
          suggestedFix: 'Implement data archiving or review data retention policies'
        },
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }
    
    // Check disk usage of tablespace
    try {
      const diskResult = await executeSql(`
        SELECT 
          spcname as tablespace,
          pg_tablespace_location(oid) as location
        FROM pg_tablespace
        WHERE spcname = 'pg_default'
      `);
      
      if (diskResult.rows.length > 0) {
        const location = diskResult.rows[0].location;
        
        // TODO: Check disk usage of the tablespace
        // This requires system-level access, which may not be available in all environments
        // For now, we're skipping this check
      }
    } catch (error) {
      // Silently ignore this check as it requires system-level access
    }
  } catch (error) {
    logger.error(`Error checking system status: ${error.message}`);
  }
  
  return alerts;
}

// Check schema cache status
async function checkSchemaCacheStatus(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  
  try {
    const result = await callRpc('execute_sql', {
      query: `SELECT verify_schema_cache()`
    });
    
    if (result && result.error) {
      alerts.push({
        id: `schema-cache-error-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: 'system',
        severity: 'high',
        message: 'Schema cache verification failed',
        details: {
          error: result.error,
          suggestedFix: 'Run `npm run mcp:refresh-schema` to refresh the schema cache'
        },
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }
  } catch (error) {
    logger.error(`Error checking schema cache status: ${error.message}`);
  }
  
  return alerts;
}

// Run all checks and generate alerts
async function runAlertChecks() {
  logger.info('Running alert checks...');
  
  try {
    // Run all checks
    const slowQueryAlerts = await checkSlowQueries();
    const rlsSecurityAlerts = await checkRlsSecurity();
    const archivingAlerts = await checkTablesForArchiving();
    const systemAlerts = await checkSystemStatus();
    const schemaCacheAlerts = await checkSchemaCacheStatus();
    
    // Combine all alerts
    const allAlerts = [
      ...slowQueryAlerts,
      ...rlsSecurityAlerts,
      ...archivingAlerts,
      ...systemAlerts,
      ...schemaCacheAlerts
    ];
    
    // Save all alerts to files
    allAlerts.forEach(saveAlert);
    
    // Log summary
    if (allAlerts.length > 0) {
      logger.warning(`Generated ${allAlerts.length} alerts`);
      
      const alertTypeCount = allAlerts.reduce((acc, alert) => {
        acc[alert.type] = (acc[alert.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(alertTypeCount).forEach(([type, count]) => {
        logger.info(`- ${count} ${type} alerts`);
      });
      
      const criticalAlerts = allAlerts.filter(a => a.severity === 'critical').length;
      const highAlerts = allAlerts.filter(a => a.severity === 'high').length;
      
      if (criticalAlerts > 0) {
        logger.error(`${criticalAlerts} CRITICAL alerts detected!`);
      }
      
      if (highAlerts > 0) {
        logger.warning(`${highAlerts} HIGH severity alerts detected!`);
      }
    } else {
      logger.success('No alerts generated - all systems nominal');
    }
    
    return allAlerts;
  } catch (error) {
    logger.error(`Error running alert checks: ${error.message}`);
    return [];
  } finally {
    // Disconnect from the database
    await disconnectFromDb();
  }
}

// Main function to run the alert system once
async function runOnce() {
  try {
    await runAlertChecks();
  } catch (error) {
    logger.error(`Error running alert checks: ${error.message}`);
  }
}

// Main function to run the alert system continuously
async function run() {
  while (true) {
    try {
      await runAlertChecks();
    } catch (error) {
      logger.error(`Error running alert checks: ${error.message}`);
    }
    
    // Wait for the configured interval
    const waitMinutes = config.alertIntervalMinutes;
    logger.info(`Waiting ${waitMinutes} minutes until next check...`);
    await new Promise(resolve => setTimeout(resolve, waitMinutes * 60 * 1000));
  }
}

// Export functions
export {
  runOnce,
  run,
  runAlertChecks,
  checkSlowQueries,
  checkRlsSecurity,
  checkTablesForArchiving,
  checkSystemStatus,
  checkSchemaCacheStatus
};

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--once')) {
    runOnce().catch(err => {
      logger.error(`Fatal error: ${err.message}`);
      process.exit(1);
    });
  } else {
    run().catch(err => {
      logger.error(`Fatal error: ${err.message}`);
      process.exit(1);
    });
  }
} 