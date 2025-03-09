export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at?: string;
          first_name?: string;
          last_name?: string;
          role: string;
          department?: string;
          venue?: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
          first_name?: string;
          last_name?: string;
          role: string;
          department?: string;
          venue?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
          first_name?: string;
          last_name?: string;
          role?: string;
          department?: string;
          venue?: string;
        };
      };
      // Add more tables as needed
    };
    Views: {
      // Define views here if needed
    };
    Functions: {
      // Define functions here if needed
    };
  };
}; 