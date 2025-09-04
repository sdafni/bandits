#!/bin/bash

# Script to switch to development-optimized Gradle configuration
echo "Switching to development configuration..."

# Backup current gradle.properties
cp gradle.properties gradle-release.properties

# Copy development configuration
cp gradle-dev.properties gradle.properties

echo "✅ Switched to development configuration"
echo "📝 Current optimizations:"
echo "   - New Architecture: DISABLED"
echo "   - Hermes: DISABLED" 
echo "   - ProGuard: DISABLED"
echo "   - Single architecture: arm64-v8a only"
echo "   - Increased JVM memory: 4GB"
echo "   - Parallel workers: 4"
echo ""
echo "To switch back to release configuration, run: ./switch-to-release.sh"
