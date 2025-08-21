import { useState } from "react";
import { CreateAccountStep1 } from "@/components/register/CreateAccountStep1";
import { CreateAccountStep2 } from "@/components/register/CreateAccountStep2";

export function CreateAccountPage() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  // Maneja errores que vengan desde el paso 1
  function handleTokenError(errorMessage: string) {
    setError(errorMessage);
    setStep(1);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      {step === 1 && (
        <CreateAccountStep1
          formData={formData}
          onChange={handleChange}
          onNext={() => setStep(2)}
          onTokenError={handleTokenError}
          error={error} 
        />
      )}

      {step === 2 && (
        <CreateAccountStep2
          formData={formData}
          onChange={handleChange}
          onBack={() => setStep(1)}
        />
      )}
    </div>
  );
}
