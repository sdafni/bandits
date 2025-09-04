#!/bin/bash

# Script to switch to release-optimized Gradle configuration
echo "Switching to release configuration..."

# Restore release configuration
cp gradle-release.properties gradle.properties

echo "✅ Switched to release configuration"
echo "📝 Current optimizations:"
echo "   - New Architecture: DISABLED (can be enabled if needed)"
echo "   - Hermes: ENABLED"
echo "   - ProGuard: ENABLED"
echo "   - Single architecture: arm64-v8a only"
echo "   - Increased JVM memory: 4GB"
echo "   - Parallel workers: 4"
echo ""
echo "To switch back to development configuration, run: ./switch-to-dev.sh"
