import * as cron from 'node-cron';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

// Configuration
const config = {
  logDirectory: path.join(__dirname, 'logs'),
  tasks: {
    verifyAll: {
      schedule: '0 2 * * 0', // Every Sunday at 2:00 AM
      command: 'npm',
      args: ['run', 'mcp:verify-all'],
      description: 'Weekly verification of all database tools'
    },
    refreshSchema: {
      schedule: '0 1 * * *', // Every day at 1:00 AM
      command: 'npm',
      args: ['run', 'mcp:refresh-schema'],
      description: 'Daily schema cache refresh'
    },
    runArchiving: {
      schedule: '0 3 * * *', // Every day at 3:00 AM
      command: 'npm',
      args: ['run', 'mcp:archive-run'],
      description: 'Daily data archiving run'
    },
    checkAlerts: {
      schedule: '0 */4 * * *', // Every 4 hours
      command: 'npm',
      args: ['run', 'mcp:alerts:once'],
      description: 'Check for system alerts every 4 hours'
    },
    securityAudit: {
      schedule: '0 4 * * 1', // Every Monday at 4:00 AM
      command: 'npm',
      args: ['run', 'mcp:security-fix'],
      description: 'Weekly security audit and fix'
    }
  }
};

// Ensure log directory exists
if (!fs.existsSync(config.logDirectory)) {
  fs.mkdirSync(config.logDirectory, { recursive: true });
}

// Logger utility
const logger = {
  info: (message: string) => console.log(chalk.blue(`[INFO] ${message}`)),
  success: (message: string) => console.log(chalk.green(`[SUCCESS] ${message}`)),
  warning: (message: string) => console.log(chalk.yellow(`[WARNING] ${message}`)),
  error: (message: string) => console.log(chalk.red(`[ERROR] ${message}`)),
  log: (message: string) => {
    console.log(message);
    appendToLogFile('scheduler.log', message);
  }
};

// Function to append to log file
function appendToLogFile(filename: string, message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  const logFilePath = path.join(config.logDirectory, filename);
  
  fs.appendFileSync(logFilePath, logMessage);
}

// Function to execute a scheduled task
function executeTask(taskName: string, taskConfig: any) {
  const logFilename = `${taskName}-${new Date().toISOString().split('T')[0]}.log`;
  const logFilePath = path.join(config.logDirectory, logFilename);
  
  logger.info(`Executing task: ${taskName} - ${taskConfig.description}`);
  
  // Create task-specific log file
  fs.writeFileSync(
    logFilePath, 
    `Task: ${taskName}\nDescription: ${taskConfig.description}\nStarted: ${new Date().toISOString()}\n\n`
  );
  
  // Spawn the process
  const process = spawn(taskConfig.command, taskConfig.args, {
    cwd: path.resolve(__dirname, '../../')
  });
  
  // Log standard output
  process.stdout.on('data', (data) => {
    const output = data.toString();
    fs.appendFileSync(logFilePath, output);
  });
  
  // Log error output
  process.stderr.on('data', (data) => {
    const output = data.toString();
    fs.appendFileSync(logFilePath, `[ERROR] ${output}`);
  });
  
  // Handle process completion
  process.on('close', (code) => {
    const message = code === 0
      ? `Task ${taskName} completed successfully`
      : `Task ${taskName} failed with exit code ${code}`;
    
    fs.appendFileSync(
      logFilePath, 
      `\nExit Code: ${code}\nFinished: ${new Date().toISOString()}\n`
    );
    
    if (code === 0) {
      logger.success(message);
    } else {
      logger.error(message);
    }
    
    logger.log(message);
  });
}

// Schedule all tasks
function scheduleAllTasks() {
  logger.info('Scheduling tasks...');
  
  for (const [taskName, taskConfig] of Object.entries(config.tasks)) {
    try {
      cron.schedule(taskConfig.schedule, () => {
        executeTask(taskName, taskConfig);
      });
      
      logger.success(`Scheduled task ${taskName}: ${taskConfig.description} (${taskConfig.schedule})`);
    } catch (error) {
      logger.error(`Failed to schedule task ${taskName}: ${error.message}`);
    }
  }
}

// Function to run a task immediately
function runTaskNow(taskName: string) {
  const taskConfig = config.tasks[taskName];
  
  if (!taskConfig) {
    logger.error(`Task not found: ${taskName}`);
    return;
  }
  
  executeTask(taskName, taskConfig);
}

// Run a specific task now by providing its name as argument
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--run') && args.length > 1) {
    const taskToRun = args[args.indexOf('--run') + 1];
    
    if (config.tasks[taskToRun]) {
      runTaskNow(taskToRun);
    } else {
      logger.error(`Unknown task: ${taskToRun}`);
      logger.info(`Available tasks: ${Object.keys(config.tasks).join(', ')}`);
    }
  } else if (args.includes('--list')) {
    logger.info('Available tasks:');
    
    for (const [taskName, taskConfig] of Object.entries(config.tasks)) {
      console.log(`- ${taskName}: ${taskConfig.description} (Schedule: ${taskConfig.schedule})`);
    }
  } else {
    // Start the scheduler
    scheduleAllTasks();
    logger.info('Task scheduler started. Press Ctrl+C to exit.');
  }
}

// Export functions for programmatic use
export {
  scheduleAllTasks,
  runTaskNow
}; 