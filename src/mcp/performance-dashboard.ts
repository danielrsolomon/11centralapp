import { Client } from 'pg';
import * as express from 'express';
import * as http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

// Configuration
const config = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'postgres',
  dashboardPort: parseInt(process.env.DASHBOARD_PORT || '3200')
};

// Database client
const client = new Client(config);

// Express app and server setup
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Main dashboard HTML
const dashboardHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>11Central Database Performance Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .card {
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .card-header {
      font-weight: bold;
      background-color: #4e73df;
      color: white;
    }
    .dashboard-title {
      margin-bottom: 30px;
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
    }
    .stat-label {
      font-size: 14px;
      color: #7f8c8d;
    }
    .alert-banner {
      display: none;
      margin-bottom: 20px;
    }
    table.performance-table {
      font-size: 14px;
    }
    table.performance-table th {
      background-color: #e9ecef;
    }
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 5px;
    }
    .status-good {
      background-color: #2ecc71;
    }
    .status-warning {
      background-color: #f39c12;
    }
    .status-critical {
      background-color: #e74c3c;
    }
    .refresh-time {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container-fluid">
    <h1 class="dashboard-title">11Central Database Performance Dashboard</h1>
    
    <div class="alert alert-warning alert-banner" id="alertBanner" role="alert">
      <strong>Performance Alert:</strong> <span id="alertMessage"></span>
    </div>
    
    <div class="row">
      <div class="col-md-3">
        <div class="card">
          <div class="card-header">Database Overview</div>
          <div class="card-body">
            <div class="row">
              <div class="col-6 text-center mb-3">
                <div class="stat-value" id="dbSize">-</div>
                <div class="stat-label">Database Size</div>
              </div>
              <div class="col-6 text-center mb-3">
                <div class="stat-value" id="tableCount">-</div>
                <div class="stat-label">Tables</div>
              </div>
              <div class="col-6 text-center">
                <div class="stat-value" id="activeConnections">-</div>
                <div class="stat-label">Active Connections</div>
              </div>
              <div class="col-6 text-center">
                <div class="stat-value" id="uptime">-</div>
                <div class="stat-label">Uptime (hrs)</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">System Status</div>
          <div class="card-body">
            <ul class="list-group">
              <li class="list-group-item d-flex justify-content-between align-items-center">
                Database
                <span>
                  <span class="status-indicator status-good" id="dbStatus"></span>
                  <span id="dbStatusText">Good</span>
                </span>
              </li>
              <li class="list-group-item d-flex justify-content-between align-items-center">
                Schema Cache
                <span>
                  <span class="status-indicator status-good" id="schemaCacheStatus"></span>
                  <span id="schemaCacheStatusText">Good</span>
                </span>
              </li>
              <li class="list-group-item d-flex justify-content-between align-items-center">
                RLS Policies
                <span>
                  <span class="status-indicator status-good" id="rlsStatus"></span>
                  <span id="rlsStatusText">Good</span>
                </span>
              </li>
              <li class="list-group-item d-flex justify-content-between align-items-center">
                Data Archiving
                <span>
                  <span class="status-indicator status-good" id="archiveStatus"></span>
                  <span id="archiveStatusText">Good</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="col-md-9">
        <div class="row">
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">Query Performance</div>
              <div class="card-body">
                <canvas id="queryPerformanceChart" height="250"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">Transaction Rates</div>
              <div class="card-body">
                <canvas id="transactionRateChart" height="250"></canvas>
              </div>
            </div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">Slow Queries</div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-striped table-hover performance-table">
                <thead>
                  <tr>
                    <th>Query</th>
                    <th>Duration (ms)</th>
                    <th>Executions</th>
                    <th>Table</th>
                    <th>Last Executed</th>
                  </tr>
                </thead>
                <tbody id="slowQueriesTable">
                  <tr>
                    <td colspan="5" class="text-center">Loading data...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">Table Statistics</div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-striped table-hover performance-table">
                <thead>
                  <tr>
                    <th>Table</th>
                    <th>Row Count</th>
                    <th>Size</th>
                    <th>Index Size</th>
                    <th>Seq Scans</th>
                    <th>Index Scans</th>
                  </tr>
                </thead>
                <tbody id="tableStatsTable">
                  <tr>
                    <td colspan="6" class="text-center">Loading data...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-header">Performance Recommendations</div>
      <div class="card-body">
        <ul class="list-group" id="recommendationsList">
          <li class="list-group-item text-center">Loading recommendations...</li>
        </ul>
      </div>
    </div>
    
    <div class="text-center refresh-time">
      Last refreshed: <span id="lastRefreshTime">-</span>
    </div>
  </div>
  
  <script>
    // Socket.io connection
    const socket = io();
    
    // Charts
    let queryPerformanceChart;
    let transactionRateChart;
    
    // Initialize charts on document load
    document.addEventListener('DOMContentLoaded', function() {
      // Query Performance Chart
      const qpCtx = document.getElementById('queryPerformanceChart').getContext('2d');
      queryPerformanceChart = new Chart(qpCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'SELECT',
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              data: [],
              tension: 0.1
            },
            {
              label: 'INSERT',
              borderColor: '#2ecc71',
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              data: [],
              tension: 0.1
            },
            {
              label: 'UPDATE',
              borderColor: '#f39c12',
              backgroundColor: 'rgba(243, 156, 18, 0.1)',
              data: [],
              tension: 0.1
            },
            {
              label: 'DELETE',
              borderColor: '#e74c3c',
              backgroundColor: 'rgba(231, 76, 60, 0.1)',
              data: [],
              tension: 0.1
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Avg. Duration (ms)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Time'
              }
            }
          }
        }
      });
      
      // Transaction Rate Chart
      const trCtx = document.getElementById('transactionRateChart').getContext('2d');
      transactionRateChart = new Chart(trCtx, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            label: 'Transactions Per Minute',
            backgroundColor: 'rgba(78, 115, 223, 0.7)',
            borderColor: '#4e73df',
            borderWidth: 1,
            data: []
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Transactions'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Time'
              }
            }
          }
        }
      });
    });
    
    // Handle socket events
    socket.on('dashboard-update', function(data) {
      updateDashboard(data);
    });
    
    socket.on('performance-alert', function(data) {
      showAlert(data.message, data.level);
    });
    
    // Update dashboard with new data
    function updateDashboard(data) {
      // Update database overview
      document.getElementById('dbSize').textContent = data.overview.size;
      document.getElementById('tableCount').textContent = data.overview.tableCount;
      document.getElementById('activeConnections').textContent = data.overview.connections;
      document.getElementById('uptime').textContent = data.overview.uptime;
      
      // Update system status
      updateStatus('dbStatus', 'dbStatusText', data.status.database);
      updateStatus('schemaCacheStatus', 'schemaCacheStatusText', data.status.schemaCache);
      updateStatus('rlsStatus', 'rlsStatusText', data.status.rls);
      updateStatus('archiveStatus', 'archiveStatusText', data.status.archiving);
      
      // Update charts
      updateQueryPerformanceChart(data.queryPerformance);
      updateTransactionRateChart(data.transactionRate);
      
      // Update tables
      updateSlowQueriesTable(data.slowQueries);
      updateTableStatsTable(data.tableStats);
      
      // Update recommendations
      updateRecommendations(data.recommendations);
      
      // Update refresh time
      document.getElementById('lastRefreshTime').textContent = new Date().toLocaleString();
    }
    
    // Update status indicators
    function updateStatus(indicatorId, textId, status) {
      const indicator = document.getElementById(indicatorId);
      const text = document.getElementById(textId);
      
      indicator.className = 'status-indicator';
      
      switch(status.level) {
        case 'good':
          indicator.classList.add('status-good');
          text.textContent = 'Good';
          break;
        case 'warning':
          indicator.classList.add('status-warning');
          text.textContent = 'Warning';
          break;
        case 'critical':
          indicator.classList.add('status-critical');
          text.textContent = 'Critical';
          break;
      }
    }
    
    // Update Query Performance Chart
    function updateQueryPerformanceChart(data) {
      // Add new data point
      queryPerformanceChart.data.labels.push(data.time);
      queryPerformanceChart.data.datasets[0].data.push(data.select);
      queryPerformanceChart.data.datasets[1].data.push(data.insert);
      queryPerformanceChart.data.datasets[2].data.push(data.update);
      queryPerformanceChart.data.datasets[3].data.push(data.delete);
      
      // Keep only the last 10 data points
      if (queryPerformanceChart.data.labels.length > 10) {
        queryPerformanceChart.data.labels.shift();
        queryPerformanceChart.data.datasets.forEach(dataset => {
          dataset.data.shift();
        });
      }
      
      queryPerformanceChart.update();
    }
    
    // Update Transaction Rate Chart
    function updateTransactionRateChart(data) {
      // Add new data point
      transactionRateChart.data.labels.push(data.time);
      transactionRateChart.data.datasets[0].data.push(data.count);
      
      // Keep only the last 10 data points
      if (transactionRateChart.data.labels.length > 10) {
        transactionRateChart.data.labels.shift();
        transactionRateChart.data.datasets[0].data.shift();
      }
      
      transactionRateChart.update();
    }
    
    // Update Slow Queries Table
    function updateSlowQueriesTable(queries) {
      const table = document.getElementById('slowQueriesTable');
      table.innerHTML = '';
      
      queries.forEach(query => {
        const row = document.createElement('tr');
        
        // Truncate long queries
        let queryText = query.query;
        if (queryText.length > 60) {
          queryText = queryText.substring(0, 57) + '...';
        }
        
        row.innerHTML = `
          <td title="${query.query}">${queryText}</td>
          <td>${query.duration}</td>
          <td>${query.executions}</td>
          <td>${query.table}</td>
          <td>${query.lastExecuted}</td>
        `;
        
        table.appendChild(row);
      });
      
      if (queries.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" class="text-center">No slow queries detected</td>';
        table.appendChild(row);
      }
    }
    
    // Update Table Stats Table
    function updateTableStatsTable(stats) {
      const table = document.getElementById('tableStatsTable');
      table.innerHTML = '';
      
      stats.forEach(stat => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${stat.table}</td>
          <td>${stat.rowCount}</td>
          <td>${stat.size}</td>
          <td>${stat.indexSize}</td>
          <td>${stat.seqScans}</td>
          <td>${stat.indexScans}</td>
        `;
        table.appendChild(row);
      });
    }
    
    // Update Recommendations
    function updateRecommendations(recommendations) {
      const list = document.getElementById('recommendationsList');
      list.innerHTML = '';
      
      recommendations.forEach(rec => {
        const item = document.createElement('li');
        item.className = 'list-group-item';
        
        // Add severity indication
        let badgeClass = 'bg-info';
        if (rec.severity === 'high') {
          badgeClass = 'bg-danger';
        } else if (rec.severity === 'medium') {
          badgeClass = 'bg-warning text-dark';
        }
        
        item.innerHTML = `
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <span class="badge ${badgeClass} me-2">${rec.severity}</span>
              ${rec.message}
            </div>
            <small class="text-muted">${rec.category}</small>
          </div>
        `;
        
        list.appendChild(item);
      });
      
      if (recommendations.length === 0) {
        const item = document.createElement('li');
        item.className = 'list-group-item text-center';
        item.textContent = 'No recommendations at this time';
        list.appendChild(item);
      }
    }
    
    // Show alert banner
    function showAlert(message, level) {
      const alertBanner = document.getElementById('alertBanner');
      const alertMessage = document.getElementById('alertMessage');
      
      alertMessage.textContent = message;
      alertBanner.className = 'alert alert-banner';
      
      switch(level) {
        case 'warning':
          alertBanner.classList.add('alert-warning');
          break;
        case 'critical':
          alertBanner.classList.add('alert-danger');
          break;
        default:
          alertBanner.classList.add('alert-info');
      }
      
      alertBanner.style.display = 'block';
      
      // Hide after 10 seconds
      setTimeout(() => {
        alertBanner.style.display = 'none';
      }, 10000);
    }
  </script>
</body>
</html>
`;

// Ensure public directory exists
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Create directory for the dashboard route
app.get('/dashboard', (req, res) => {
  res.send(dashboardHtml);
});

app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Performance data
let performanceData = {
  overview: {
    size: '0 MB',
    tableCount: 0,
    connections: 0,
    uptime: 0
  },
  status: {
    database: { level: 'good', message: 'Operating normally' },
    schemaCache: { level: 'good', message: 'Cache up to date' },
    rls: { level: 'good', message: 'Policies configured' },
    archiving: { level: 'good', message: 'Running on schedule' }
  },
  queryPerformance: {
    time: new Date().toLocaleTimeString(),
    select: 0,
    insert: 0,
    update: 0,
    delete: 0
  },
  transactionRate: {
    time: new Date().toLocaleTimeString(),
    count: 0
  },
  slowQueries: [],
  tableStats: [],
  recommendations: []
};

// Database functions
async function getDatabaseOverview() {
  try {
    // Get database size
    const sizeResult = await client.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);
    performanceData.overview.size = sizeResult.rows[0].size;
    
    // Get table count
    const tableCountResult = await client.query(`
      SELECT count(*) as count FROM pg_tables WHERE schemaname = 'public'
    `);
    performanceData.overview.tableCount = parseInt(tableCountResult.rows[0].count);
    
    // Get active connections
    const connectionsResult = await client.query(`
      SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()
    `);
    performanceData.overview.connections = parseInt(connectionsResult.rows[0].count);
    
    // Get uptime
    const uptimeResult = await client.query(`
      SELECT extract(epoch from current_timestamp - pg_postmaster_start_time()) / 3600 as hours
    `);
    performanceData.overview.uptime = Math.round(parseFloat(uptimeResult.rows[0].hours) * 10) / 10;
  } catch (error) {
    console.error(chalk.red('Error getting database overview:'), error);
    performanceData.status.database = { level: 'warning', message: 'Error fetching stats' };
  }
}

async function getQueryPerformance() {
  try {
    const result = await client.query(`
      SELECT 
        LEFT(query, 50) as short_query,
        calls,
        round(total_time / calls, 2) as avg_time,
        substring(query, '^\s*(\w+)') as query_type
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      AND query NOT LIKE '%pg_stat_activity%'
      ORDER BY total_time / calls DESC
      LIMIT 100
    `);
    
    // Calculate average time by query type
    let selectTime = 0;
    let insertTime = 0;
    let updateTime = 0;
    let deleteTime = 0;
    
    let selectCount = 0;
    let insertCount = 0;
    let updateCount = 0;
    let deleteCount = 0;
    
    for (const row of result.rows) {
      const queryType = (row.query_type || '').toUpperCase();
      
      switch (queryType) {
        case 'SELECT':
          selectTime += parseFloat(row.avg_time);
          selectCount++;
          break;
        case 'INSERT':
          insertTime += parseFloat(row.avg_time);
          insertCount++;
          break;
        case 'UPDATE':
          updateTime += parseFloat(row.avg_time);
          updateCount++;
          break;
        case 'DELETE':
          deleteTime += parseFloat(row.avg_time);
          deleteCount++;
          break;
      }
    }
    
    // Calculate averages
    performanceData.queryPerformance = {
      time: new Date().toLocaleTimeString(),
      select: selectCount > 0 ? Math.round(selectTime / selectCount * 100) / 100 : 0,
      insert: insertCount > 0 ? Math.round(insertTime / insertCount * 100) / 100 : 0,
      update: updateCount > 0 ? Math.round(updateTime / updateCount * 100) / 100 : 0,
      delete: deleteCount > 0 ? Math.round(deleteTime / deleteCount * 100) / 100 : 0
    };
    
    // Get slow queries
    performanceData.slowQueries = [];
    
    for (const row of result.rows) {
      if (parseFloat(row.avg_time) > 100) { // Queries taking more than 100ms
        // Extract table name from query
        let tableName = 'Unknown';
        const tableMatch = row.short_query.match(/FROM\s+([^\s,;]+)/i);
        if (tableMatch && tableMatch[1]) {
          tableName = tableMatch[1].replace(/[^a-zA-Z0-9_]/g, '');
        }
        
        performanceData.slowQueries.push({
          query: row.short_query,
          duration: Math.round(parseFloat(row.avg_time) * 100) / 100,
          executions: row.calls,
          table: tableName,
          lastExecuted: 'Recent'
        });
        
        if (performanceData.slowQueries.length >= 5) {
          break;
        }
      }
    }
  } catch (error) {
    console.error(chalk.red('Error getting query performance:'), error);
  }
}

async function getTransactionStats() {
  try {
    const result = await client.query(`
      SELECT 
        xact_commit + xact_rollback as total_xact
      FROM pg_stat_database
      WHERE datname = current_database()
    `);
    
    const totalTransactions = parseInt(result.rows[0].total_xact);
    
    // Store the current value for the chart
    performanceData.transactionRate = {
      time: new Date().toLocaleTimeString(),
      count: totalTransactions
    };
  } catch (error) {
    console.error(chalk.red('Error getting transaction stats:'), error);
  }
}

async function getTableStats() {
  try {
    const result = await client.query(`
      SELECT
        relname as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) as total_size,
        pg_size_pretty(pg_indexes_size(schemaname || '.' || relname)) as index_size,
        seq_scan as sequential_scans,
        idx_scan as index_scans
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
      LIMIT 10
    `);
    
    performanceData.tableStats = result.rows.map(row => ({
      table: row.table_name,
      rowCount: row.row_count,
      size: row.total_size,
      indexSize: row.index_size,
      seqScans: row.sequential_scans,
      indexScans: row.index_scans
    }));
  } catch (error) {
    console.error(chalk.red('Error getting table stats:'), error);
  }
}

async function checkSchemaCacheStatus() {
  try {
    // Check if refresh_schema_cache function exists
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'refresh_schema_cache'
        AND pg_function_is_visible(oid)
      ) as exists
    `);
    
    if (result.rows[0].exists) {
      performanceData.status.schemaCache = { 
        level: 'good', 
        message: 'Schema cache function available' 
      };
    } else {
      performanceData.status.schemaCache = { 
        level: 'warning', 
        message: 'Schema cache function not found' 
      };
      
      // Add recommendation
      performanceData.recommendations.push({
        severity: 'medium',
        category: 'Schema Cache',
        message: 'Create refresh_schema_cache function to improve schema refresh capability'
      });
    }
  } catch (error) {
    console.error(chalk.red('Error checking schema cache status:'), error);
    performanceData.status.schemaCache = { 
      level: 'warning', 
      message: 'Error checking schema cache' 
    };
  }
}

async function checkRLSStatus() {
  try {
    // Get tables without RLS enabled
    const result = await client.query(`
      SELECT 
        c.relname as table_name 
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
      AND n.nspname = 'public'
      AND c.relrowsecurity = false
      AND c.relname NOT LIKE 'pg_%'
      AND c.relname NOT LIKE '_prisma_%'
      LIMIT 5
    `);
    
    if (result.rows.length === 0) {
      performanceData.status.rls = { 
        level: 'good', 
        message: 'RLS enabled on all tables' 
      };
    } else {
      const tablesWithoutRLS = result.rows.map(row => row.table_name).join(', ');
      
      performanceData.status.rls = { 
        level: 'warning', 
        message: `${result.rows.length} tables without RLS` 
      };
      
      // Add recommendation
      performanceData.recommendations.push({
        severity: 'high',
        category: 'Security',
        message: `Enable RLS on tables: ${tablesWithoutRLS}`
      });
    }
  } catch (error) {
    console.error(chalk.red('Error checking RLS status:'), error);
    performanceData.status.rls = { 
      level: 'warning', 
      message: 'Error checking RLS status' 
    };
  }
}

async function checkArchivingStatus() {
  try {
    // Check if archive policies table exists
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'archive_policies'
      ) as exists
    `);
    
    if (result.rows[0].exists) {
      // Check if there are active policies
      const policiesResult = await client.query(`
        SELECT count(*) as count FROM archive_policies WHERE is_active = true
      `);
      
      const activePoliciesCount = parseInt(policiesResult.rows[0].count);
      
      if (activePoliciesCount > 0) {
        performanceData.status.archiving = { 
          level: 'good', 
          message: `${activePoliciesCount} active archiving policies` 
        };
      } else {
        performanceData.status.archiving = { 
          level: 'warning', 
          message: 'No active archiving policies' 
        };
        
        // Add recommendation
        performanceData.recommendations.push({
          severity: 'medium',
          category: 'Data Management',
          message: 'Create archiving policies to manage data retention'
        });
      }
    } else {
      performanceData.status.archiving = { 
        level: 'warning', 
        message: 'Archiving not configured' 
      };
      
      // Add recommendation
      performanceData.recommendations.push({
        severity: 'medium',
        category: 'Data Management',
        message: 'Set up data archiving to improve database performance'
      });
    }
  } catch (error) {
    console.error(chalk.red('Error checking archiving status:'), error);
    performanceData.status.archiving = { 
      level: 'warning', 
      message: 'Error checking archiving status' 
    };
  }
}

async function generateRecommendations() {
  try {
    // Check for tables without primary keys
    const noPkResult = await client.query(`
      SELECT 
        c.relname as table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_constraint con ON con.conrelid = c.oid AND con.contype = 'p'
      WHERE c.relkind = 'r'
      AND n.nspname = 'public'
      AND con.conname IS NULL
      AND c.relname NOT LIKE 'pg_%'
      AND c.relname NOT LIKE '_prisma_%'
      LIMIT 5
    `);
    
    if (noPkResult.rows.length > 0) {
      const tablesWithoutPK = noPkResult.rows.map(row => row.table_name).join(', ');
      
      performanceData.recommendations.push({
        severity: 'high',
        category: 'Data Integrity',
        message: `Add primary keys to tables: ${tablesWithoutPK}`
      });
    }
    
    // Check for tables with high sequence scans but no index scans
    const noIndexResult = await client.query(`
      SELECT 
        relname as table_name,
        seq_scan,
        idx_scan
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      AND seq_scan > 50
      AND (idx_scan = 0 OR idx_scan / seq_scan < 0.1)
      LIMIT 5
    `);
    
    if (noIndexResult.rows.length > 0) {
      for (const row of noIndexResult.rows) {
        performanceData.recommendations.push({
          severity: 'medium',
          category: 'Performance',
          message: `Table '${row.table_name}' has high sequence scans (${row.seq_scan}). Consider adding indexes.`
        });
      }
    }
    
    // Check for large tables
    const largeTablesResult = await client.query(`
      SELECT 
        relname as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) as total_size
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      AND n_live_tup > 10000
      LIMIT 3
    `);
    
    if (largeTablesResult.rows.length > 0) {
      for (const row of largeTablesResult.rows) {
        performanceData.recommendations.push({
          severity: 'low',
          category: 'Data Management',
          message: `Table '${row.table_name}' is large (${row.total_size}, ${row.row_count} rows). Consider archiving older data.`
        });
      }
    }
  } catch (error) {
    console.error(chalk.red('Error generating recommendations:'), error);
  }
}

// Update dashboard data
async function updateDashboardData() {
  try {
    // Reset recommendations
    performanceData.recommendations = [];
    
    // Get all performance data
    await getDatabaseOverview();
    await getQueryPerformance();
    await getTransactionStats();
    await getTableStats();
    await checkSchemaCacheStatus();
    await checkRLSStatus();
    await checkArchivingStatus();
    await generateRecommendations();
    
    // Emit updated data to all connected clients
    io.emit('dashboard-update', performanceData);
    
    console.log(chalk.green(`Dashboard data updated at ${new Date().toLocaleTimeString()}`));
  } catch (error) {
    console.error(chalk.red('Error updating dashboard data:'), error);
  }
}

// Setup Socket.io connection events
io.on('connection', socket => {
  console.log(chalk.green('Client connected to dashboard'));
  
  // Send initial data on connection
  socket.emit('dashboard-update', performanceData);
  
  socket.on('disconnect', () => {
    console.log(chalk.yellow('Client disconnected from dashboard'));
  });
});

// Main function
async function main() {
  try {
    // Connect to the database
    await client.connect();
    console.log(chalk.green('Connected to database'));
    
    // Check if pg_stat_statements extension is available
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS pg_stat_statements');
      console.log(chalk.green('pg_stat_statements extension is available'));
    } catch (error) {
      console.error(chalk.red('Could not create pg_stat_statements extension:'), error);
      console.log(chalk.yellow('Some performance metrics will not be available'));
    }
    
    // Start server
    server.listen(config.dashboardPort, () => {
      console.log(chalk.green(`Performance dashboard running at http://localhost:${config.dashboardPort}`));
    });
    
    // Initial data update
    await updateDashboardData();
    
    // Schedule regular updates
    setInterval(updateDashboardData, 30000); // Update every 30 seconds
    
  } catch (error) {
    console.error(chalk.red('Error starting performance dashboard:'), error);
    process.exit(1);
  }
}

// Run the application
if (require.main === module) {
  main().catch(console.error);
}

export {
  updateDashboardData,
  performanceData
};