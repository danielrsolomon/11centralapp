"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDataService = void 0;
const apiService_1 = __importDefault(require("./apiService"));
class BaseDataService {
    constructor(tableName, modulePrefix = '') {
        this.tableName = tableName;
        // Create endpoint based on table name, e.g., 'programs' -> '/university/programs'
        this.baseEndpoint = modulePrefix ? `/${modulePrefix}/${tableName}` : `/${tableName}`;
    }
    /**
     * Get all records with optional filtering
     */
    async getAll(options) {
        try {
            // REFACTORED: Replaced direct Supabase call with API request
            const queryParams = new URLSearchParams();
            // Apply filters if provided
            if (options?.filters) {
                Object.entries(options.filters).forEach(([key, value]) => {
                    queryParams.append(`filter[${key}]`, value.toString());
                });
            }
            // Apply ordering if provided
            if (options?.orderBy) {
                queryParams.append('orderBy', options.orderBy.column);
                queryParams.append('order', options.orderBy.ascending ? 'asc' : 'desc');
            }
            // Apply limit if provided
            if (options?.limit) {
                queryParams.append('limit', options.limit.toString());
            }
            const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
            const response = await apiService_1.default.get(`${this.baseEndpoint}${queryString}`);
            if (!response.success) {
                return {
                    data: null,
                    error: {
                        message: response.error?.message || 'Failed to fetch data',
                        details: response.error?.details || '',
                        hint: '',
                        code: response.error?.code || 'UNKNOWN_ERROR',
                        name: 'PostgrestError',
                    },
                };
            }
            return {
                data: response.data,
                error: null,
            };
        }
        catch (error) {
            return {
                data: null,
                error: {
                    message: 'Failed to fetch data',
                    details: error instanceof Error ? error.message : String(error),
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError',
                },
            };
        }
    }
    /**
     * Get a single record by ID
     */
    async getById(id) {
        try {
            // REFACTORED: Replaced direct Supabase call with API request
            const response = await apiService_1.default.get(`${this.baseEndpoint}/${id}`);
            if (!response.success) {
                return {
                    data: null,
                    error: {
                        message: response.error?.message || `Failed to fetch ${this.tableName} by ID`,
                        details: response.error?.details || '',
                        hint: '',
                        code: response.error?.code || 'UNKNOWN_ERROR',
                        name: 'PostgrestError',
                    },
                };
            }
            return {
                data: response.data,
                error: null,
            };
        }
        catch (error) {
            return {
                data: null,
                error: {
                    message: `Failed to fetch ${this.tableName} by ID`,
                    details: error instanceof Error ? error.message : String(error),
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError',
                },
            };
        }
    }
    /**
     * Create a new record
     */
    async create(record) {
        try {
            // REFACTORED: Replaced direct Supabase call with API request
            const response = await apiService_1.default.post(this.baseEndpoint, record);
            if (!response.success) {
                return {
                    data: null,
                    error: {
                        message: response.error?.message || `Failed to create ${this.tableName}`,
                        details: response.error?.details || '',
                        hint: '',
                        code: response.error?.code || 'UNKNOWN_ERROR',
                        name: 'PostgrestError',
                    },
                };
            }
            return {
                data: response.data,
                error: null,
            };
        }
        catch (error) {
            return {
                data: null,
                error: {
                    message: `Failed to create ${this.tableName}`,
                    details: error instanceof Error ? error.message : String(error),
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError',
                },
            };
        }
    }
    /**
     * Update an existing record
     */
    async update(id, updates) {
        try {
            // REFACTORED: Replaced direct Supabase call with API request
            const response = await apiService_1.default.put(`${this.baseEndpoint}/${id}`, updates);
            if (!response.success) {
                return {
                    data: null,
                    error: {
                        message: response.error?.message || `Failed to update ${this.tableName}`,
                        details: response.error?.details || '',
                        hint: '',
                        code: response.error?.code || 'UNKNOWN_ERROR',
                        name: 'PostgrestError',
                    },
                };
            }
            return {
                data: response.data,
                error: null,
            };
        }
        catch (error) {
            return {
                data: null,
                error: {
                    message: `Failed to update ${this.tableName}`,
                    details: error instanceof Error ? error.message : String(error),
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError',
                },
            };
        }
    }
    /**
     * Delete a record by ID
     */
    async delete(id) {
        try {
            // REFACTORED: Replaced direct Supabase call with API request
            const response = await apiService_1.default.delete(`${this.baseEndpoint}/${id}`);
            if (!response.success) {
                return {
                    data: null,
                    error: {
                        message: response.error?.message || `Failed to delete ${this.tableName}`,
                        details: response.error?.details || '',
                        hint: '',
                        code: response.error?.code || 'UNKNOWN_ERROR',
                        name: 'PostgrestError',
                    },
                };
            }
            return {
                data: response.data,
                error: null,
            };
        }
        catch (error) {
            return {
                data: null,
                error: {
                    message: `Failed to delete ${this.tableName}`,
                    details: error instanceof Error ? error.message : String(error),
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError',
                },
            };
        }
    }
    /**
     * Get records with search on specified columns
     */
    async search(searchTerm, columns, options) {
        try {
            // REFACTORED: Replaced direct Supabase call with API request
            const queryParams = new URLSearchParams();
            queryParams.append('searchTerm', searchTerm);
            queryParams.append('columns', columns.join(','));
            // Apply limit if provided
            if (options?.limit) {
                queryParams.append('limit', options.limit.toString());
            }
            const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
            const response = await apiService_1.default.get(`${this.baseEndpoint}/search${queryString}`);
            if (!response.success) {
                return {
                    data: null,
                    error: {
                        message: response.error?.message || `Failed to search ${this.tableName}`,
                        details: response.error?.details || '',
                        hint: '',
                        code: response.error?.code || 'UNKNOWN_ERROR',
                        name: 'PostgrestError',
                    },
                };
            }
            return {
                data: response.data,
                error: null,
            };
        }
        catch (error) {
            return {
                data: null,
                error: {
                    message: `Failed to search ${this.tableName}`,
                    details: error instanceof Error ? error.message : String(error),
                    hint: '',
                    code: 'UNKNOWN_ERROR',
                    name: 'PostgrestError',
                },
            };
        }
    }
}
exports.BaseDataService = BaseDataService;
//# sourceMappingURL=baseDataService.js.map