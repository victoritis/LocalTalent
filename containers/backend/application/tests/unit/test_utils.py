# tests/unit/test_utils.py

import unittest

class CustomTestResult(unittest.TextTestResult):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.passed = []
        self.custom_failures = []  # Usamos un atributo personalizado para fallos

    def addSuccess(self, test):
        super().addSuccess(test)
        self.passed.append(test)

    def addFailure(self, test, err):
        super().addFailure(test, err)
        self.custom_failures.append((test, err))

    def addError(self, test, err):
        super().addError(test, err)
        self.custom_failures.append((test, err))

class CustomTestRunner(unittest.TextTestRunner):
    resultclass = CustomTestResult

    def run(self, test):
        result = super().run(test)
        self.print_summary(result)
        return result

    @staticmethod
    def print_summary(result):
        passed_names = [test.id().split('.')[-1] for test in result.passed]
        failed_names = [test.id().split('.')[-1] for test, _ in result.custom_failures]
        
        print("\n" + "=" * 60)
        print("📊 RESUMEN GLOBAL DE TESTS")
        print("=" * 60)
        print(f"\n✅ TESTS EXITOSOS: ({len(result.passed)})")
        for name in sorted(passed_names):
            print(f" ✅ {name}")
        
        if result.custom_failures:
            print(f"\n\033[91m❌ TESTS FALLIDOS: ({len(result.custom_failures)})\033[0m")
            for name in sorted(failed_names):
                print(f" ❌ {name}")
            
            print("\n" + "-" * 60)
            print(f"Total: {result.testsRun} | Exitosos: {len(result.passed)} | Fallidos: {len(result.custom_failures)}")
            print("=" * 60)
            
            print(f"\n\033[91m🔍 DETALLES DE ERRORES:\033[0m")
            for test, traceback in result.custom_failures:
                test_name = test.id().split('.')[-1]
                print(f"\n❌ {test_name}:")
                print(traceback)
