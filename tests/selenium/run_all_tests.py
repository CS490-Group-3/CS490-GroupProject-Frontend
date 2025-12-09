"""
Run all Selenium tests for Salonica
Comprehensive test suite covering 15+ features
"""
import subprocess
import sys
import time

def run_command(cmd, description):
    """Run a command and display results"""
    print("\n" + "=" * 60)
    print(f"🚀 {description}")
    print("=" * 60)
    
    result = subprocess.run(cmd, shell=True)
    
    if result.returncode == 0:
        print(f"✅ {description} - PASSED")
    else:
        print(f"❌ {description} - FAILED")
    
    return result.returncode == 0

def main():
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║       SALONICA SELENIUM TEST SUITE - FULL RUN           ║
    ║                                                          ║
    ║  Comprehensive automated testing for salon booking app   ║
    ║  Tests: 15+ features across all user roles              ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    # Check if dev server is running
    print("⚠️  Make sure your dev server is running!")
    print("   Command: npm run dev")
    print("   Expected: http://localhost:5173")
    
    input("\n📍 Press ENTER when ready to start tests...")
    
    # Run comprehensive test suite
    success = run_command("python test_comprehensive.py", "Comprehensive Test Suite (15+ Features)")
    
    # Final summary
    print("\n" + "=" * 60)
    print("📊 TEST EXECUTION COMPLETE")
    print("=" * 60)
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Application is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check output above for details.")
    
    print("=" * 60)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())

