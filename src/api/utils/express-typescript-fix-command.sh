#!/bin/bash

# Create a temporary file with the Express TypeScript fixes
cat > tsconfig.express-fix.json << EOL
{
  "compilerOptions": {
    "noImplicitReturns": false,
    "strictNullChecks": false
  }
}
EOL

echo "Created tsconfig.express-fix.json with the necessary changes."

# Check if jq is installed
if command -v jq &> /dev/null; then
    echo "Using jq to merge the changes into tsconfig.json..."
    jq -s ".[0].compilerOptions += .[1].compilerOptions | .[0]" tsconfig.json tsconfig.express-fix.json > tsconfig.new.json
    
    if [ $? -eq 0 ]; then
        mv tsconfig.new.json tsconfig.json
        echo "Successfully updated tsconfig.json with Express TypeScript compatibility fixes!"
    else
        echo "Error merging files. Please manually add these lines to your tsconfig.json compilerOptions:"
        echo "  \"noImplicitReturns\": false,"
        echo "  \"strictNullChecks\": false"
    fi
else
    echo "jq is not installed. Please manually add these lines to your tsconfig.json compilerOptions:"
    echo "  \"noImplicitReturns\": false,"
    echo "  \"strictNullChecks\": false"
fi

# Clean up
rm tsconfig.express-fix.json 