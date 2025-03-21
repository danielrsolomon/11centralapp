import { MCPTool } from '../types';
import { supabaseTools } from './supabase-tools-node';

export const getAllTools = (): MCPTool[] => {
  return [
    ...supabaseTools,
    // Add other tools here
  ];
}; 