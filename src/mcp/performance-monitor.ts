/**
 * Performance Monitoring Script for 11Central App
 * 
 * This script measures and analyzes the performance of database operations,
 * identifies bottlenecks, and generates reports.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

// Load environment variables
config({ path: '.env.local' });

// Initialize Supabase client with service role for admin access
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Operations to benchmark
const operations = [
  {
    name: 'Simple Select',
    run: async () => {
      return await supabase.from('venues').select('*').limit(10);
    }
  },
  {
    name: 'Join Select',
    run: async () => {
      return await supabase
        .from('users')
        .select(`*, roles(*), departments:user_departments(*, departments:departments(*))`)
        .limit(10);
    }
  },
  {
    name: 'Insert',
    run: async () => {
      const testData = {
        name: `Test Venue ${Date.now()}`,
        address: `${Date.now()} Main St`
      };
      const result = await supabase.from('venues').insert(testData).select();
      
      // Clean up
      if (result.data && result.data[0]) {
        await supabase.from('venues').delete().eq('id', result.data[0].id);
      }
      
      return result;
    }
  },
  {
    name: 'Update',
    run: async () => {
      // First create a record
      const testData = {
        name: `Test Venue ${Date.now()}`,
        address: `${Date.now()} Main St`
      };
      const insertResult = await supabase.from('venues').insert(testData).select();
      
      if (!insertResult.data || !insertResult.data[0]) {
        return { error: { message: 'Failed to create test record for update' } };
      }
      
      const id = insertResult.data[0].id;
      
      // Perform the update
      const updateResult = await supabase
        .from('venues')
        .update({ name: `${testData.name} (updated)` })
        .eq('id', id)
        .select();
      
      // Clean up
      await supabase.from('venues').delete().eq('id', id);
      
      return updateResult;
    }
  },
  {
    name: 'Delete',
    run: async () => {
      // First create a record
      const testData = {
        name: `Test Venue ${Date.now()}`,
        address: `${Date.now()} Main St`
      };
      const insertResult = await supabase.from('venues').insert(testData).select();
      
      if (!insertResult.data || !insertResult.data[0]) {
        return { error: { message: 'Failed to create test record for delete' } };
      }
      
      const id = insertResult.data[0].id;
      
      // Perform the delete
      return await supabase.from('venues').delete().eq('id', id);
    }
  },
  {
    name: 'Complex Query',
    run: async () => {
      return await supabase.rpc('execute_custom_sql', {
        sql_string: `
          WITH user_data AS (
            SELECT 
              u.id, u.email, u.first_name, u.last_name,
              r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
          ),
          venue_data AS (
            SELECT v.id, v.name, count(d.id) as department_count
            FROM venues v
            LEFT JOIN departments d ON v.id = d.venue_id
            GROUP BY v.id
          ),
          schedule_data AS (
            SELECT 
              u.id as user_id, 
              count(s.id) as schedule_count,
              min(s.start_time) as earliest_schedule,
              max(s.end_time) as latest_schedule
            FROM users u
            LEFT JOIN schedules s ON u.id = s.user_id
            GROUP BY u.id
          )
          SELECT 
            ud.*, 
            vd.name as venue_name, 
            vd.department_count,
            sd.schedule_count,
            sd.earliest_schedule,
            sd.latest_schedule
          FROM user_data ud
          LEFT JOIN venue_data vd ON TRUE
          LEFT JOIN schedule_data sd ON ud.id = sd.user_id
          LIMIT 10;
        `
      });
    }
  },
  {
    name: 'Bulk Insert',
    run: async () => {
      // Generate bulk data
      const bulkData = Array.from({ length: 50 }).map((_, i) => ({
        name: `Bulk Venue ${Date.now()}-${i}`,
        address: `${Date.now()}-${i} Bulk St`
      }));
      
      // Insert bulk data
      const result = await supabase.from('venues').insert(bulkData).select();
      
      // Clean up
      if (result.data && result.data.length > 0) {
        const ids = result.data.map(record => record.id);
        await supabase.from('venues').delete().in('id', ids);
      }
      
      return result;
    }
  },
  {
    name: 'RLS Protected Access',
    run: async () => {
      // This tests RLS overhead by doing an authenticated query
      const { data: auth } = await supabase.auth.signInWithPassword({
        email: 'john.owner@11miami.com',
        password: 'owner123'  // Note: In real code, never hardcode passwords
      });
      
      if (!auth || !auth.session) {
        return { error: { message: 'Failed to authenticate for RLS test' } };
      }
      
      // Create a client with the authenticated session
      const authedClient = createClient(supabaseUrl, supabaseServiceKey, {
        global: {
          headers: {
            Authorization: `Bearer ${auth.session.access_token}`
          }
        }
      });
      
      // Perform query through RLS
      return await authedClient.from('venues').select('*').limit(10);
    }
  },
  {
    name: 'Schema Cache Refresh',
    run: async () => {
      return await supabase.rpc('execute_custom_sql', {
        sql_string: "SELECT refresh_schema_cache();"
      });
    }
  }
];

// Benchmark a specific operation
async function benchmark(operation: { name: string, run: () => Promise<any> }, iterations = 5) {
  console.log(chalk.blue(`Benchmarking: ${operation.name}`));
  
  const durations: number[] = [];
  const errors: any[] = [];
  
  for (let i = 0; i < iterations; i++) {
    console.log(`  Iteration ${i + 1} of ${iterations}...`);
    
    try {
      const start = performance.now();
      const result = await operation.run();
      const end = performance.now();
      
      const duration = end - start;
      durations.push(duration);
      
      if (result.error) {
        errors.push(result.error);
        console.log(chalk.red(`  Error: ${result.error.message}`));
      }
    } catch (error) {
      errors.push(error);
      console.log(chalk.red(`  Exception: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
  
  // Calculate statistics
  if (durations.length === 0) {
    return {
      name: operation.name,
      success: false,
      error: errors.length > 0 ? errors[0].message : 'Unknown error',
      avg: null,
      min: null,
      max: null,
      median: null
    };
  }
  
  durations.sort((a, b) => a - b);
  
  const min = durations[0];
  const max = durations[durations.length - 1];
  const sum = durations.reduce((acc, val) => acc + val, 0);
  const avg = sum / durations.length;
  const median = durations[Math.floor(durations.length / 2)];
  
  console.log(chalk.green(`  Results for ${operation.name}:`));
  console.log(`    Min: ${min.toFixed(2)} ms`);
  console.log(`    Max: ${max.toFixed(2)} ms`);
  console.log(`    Avg: ${avg.toFixed(2)} ms`);
  console.log(`    Median: ${median.toFixed(2)} ms`);
  
  return {
    name: operation.name,
    success: errors.length === 0,
    error: errors.length > 0 ? errors[0].message : null,
    avg,
    min,
    max,
    median,
    iterations: durations.length,
    errorCount: errors.length
  };
}

// Generate a report of all benchmark results
function generateReport(results: any[]) {
  // Create HTML report
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>11Central Database Performance Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1, h2 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .success { color: green; }
    .error { color: red; }
    .warning { color: orange; }
    .chart-container { width: 100%; height: 400px; margin-bottom: 30px; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <h1>11Central Database Performance Report</h1>
  <p>Generated on ${new Date().toLocaleString()}</p>
  
  <h2>Performance Summary</h2>
  <table>
    <tr>
      <th>Operation</th>
      <th>Status</th>
      <th>Min (ms)</th>
      <th>Max (ms)</th>
      <th>Avg (ms)</th>
      <th>Median (ms)</th>
      <th>Rating</th>
    </tr>
    ${results.map(result => {
      // Calculate performance rating
      let rating = 'N/A';
      let ratingClass = '';
      
      if (result.success && result.avg !== null) {
        if (result.avg < 100) {
          rating = 'Excellent';
          ratingClass = 'success';
        } else if (result.avg < 500) {
          rating = 'Good';
          ratingClass = 'success';
        } else if (result.avg < 1000) {
          rating = 'Acceptable';
          ratingClass = 'warning';
        } else {
          rating = 'Slow';
          ratingClass = 'error';
        }
      }
      
      return `
    <tr>
      <td>${result.name}</td>
      <td class="${result.success ? 'success' : 'error'}">${result.success ? 'Success' : 'Failed'}</td>
      <td>${result.min !== null ? result.min.toFixed(2) : 'N/A'}</td>
      <td>${result.max !== null ? result.max.toFixed(2) : 'N/A'}</td>
      <td>${result.avg !== null ? result.avg.toFixed(2) : 'N/A'}</td>
      <td>${result.median !== null ? result.median.toFixed(2) : 'N/A'}</td>
      <td class="${ratingClass}">${rating}</td>
    </tr>
      `;
    }).join('')}
  </table>
  
  <h2>Performance Comparison</h2>
  <div class="chart-container">
    <canvas id="performanceChart"></canvas>
  </div>
  
  <script>
    // Create chart
    const ctx = document.getElementById('performanceChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(results.map(r => r.name))},
        datasets: [{
          label: 'Average Duration (ms)',
          data: ${JSON.stringify(results.map(r => r.avg))},
          backgroundColor: ${JSON.stringify(results.map(r => {
            if (!r.success) return 'rgba(255, 0, 0, 0.5)';
            if (r.avg < 100) return 'rgba(75, 192, 192, 0.5)';
            if (r.avg < 500) return 'rgba(54, 162, 235, 0.5)';
            if (r.avg < 1000) return 'rgba(255, 206, 86, 0.5)';
            return 'rgba(255, 99, 132, 0.5)';
          }))},
          borderColor: ${JSON.stringify(results.map(r => {
            if (!r.success) return 'rgba(255, 0, 0, 1)';
            if (r.avg < 100) return 'rgba(75, 192, 192, 1)';
            if (r.avg < 500) return 'rgba(54, 162, 235, 1)';
            if (r.avg < 1000) return 'rgba(255, 206, 86, 1)';
            return 'rgba(255, 99, 132, 1)';
          }))},
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Duration (ms)'
            }
          }
        }
      }
    });
  </script>
  
  <h2>Recommendations</h2>
  <ul>
    ${results.filter(r => r.avg > 500 || !r.success).map(r => {
      if (!r.success) {
        return `<li class="error"><strong>${r.name}:</strong> Operation failed with error "${r.error}". This needs immediate attention.</li>`;
      }
      if (r.avg > 1000) {
        return `<li class="error"><strong>${r.name}:</strong> Performance is very poor (${r.avg.toFixed(2)}ms). Consider optimization or caching strategies.</li>`;
      }
      if (r.avg > 500) {
        return `<li class="warning"><strong>${r.name}:</strong> Performance could be improved (${r.avg.toFixed(2)}ms). Review query structure and indexes.</li>`;
      }
      return '';
    }).filter(item => item !== '').join('')}
    ${results.filter(r => r.success && r.avg < 500).length === results.length ? 
      '<li class="success">All operations performed within acceptable parameters. No immediate action required.</li>' : ''}
  </ul>
</body>
</html>
  `;
  
  // Write report to file
  const reportFile = path.join(__dirname, 'performance-report.html');
  fs.writeFileSync(reportFile, html);
  console.log(chalk.green(`Performance report generated at: ${reportFile}`));
  
  // Generate CSV
  const csv = [
    'Operation,Status,Min (ms),Max (ms),Avg (ms),Median (ms)',
    ...results.map(r => `"${r.name}","${r.success ? 'Success' : 'Failed'}",${r.min !== null ? r.min.toFixed(2) : 'N/A'},${r.max !== null ? r.max.toFixed(2) : 'N/A'},${r.avg !== null ? r.avg.toFixed(2) : 'N/A'},${r.median !== null ? r.median.toFixed(2) : 'N/A'}`)
  ].join('\n');
  
  const csvFile = path.join(__dirname, 'performance-report.csv');
  fs.writeFileSync(csvFile, csv);
  console.log(chalk.green(`CSV report generated at: ${csvFile}`));
}

// Main function
async function main() {
  try {
    console.log(chalk.blue('Starting Performance Monitoring'));
    console.log('Connecting to Supabase...');
    
    // Check connection
    const { data, error } = await supabase.from('venues').select('count(*)', { count: 'exact' });
    
    if (error) {
      console.error(chalk.red('Failed to connect to Supabase:'), error.message);
      process.exit(1);
    }
    
    console.log(chalk.green('Connected to Supabase successfully'));
    
    // Run benchmarks
    const results = [];
    
    for (const operation of operations) {
      const result = await benchmark(operation);
      results.push(result);
    }
    
    // Generate report
    generateReport(results);
    
    console.log(chalk.green('Performance monitoring completed successfully'));
  } catch (error) {
    console.error(chalk.red('Performance monitoring failed:'), error);
  }
}

// Run the script
main(); 