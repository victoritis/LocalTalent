import { useState } from "react";
import { LoginStep1, FormValues } from "./LoginStep1";
import { LoginStep2 } from "./LoginStep2";
import { useAuth } from "../../auth"; 

export function LoginForm() {
  const [step, setStep] = useState(1);
  const [validatedCredentials, setValidatedCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [customAlert, setCustomAlert] = useState<{ type: "" | "success" | "error"; message: string }>({
    type: "",
    message: "",
  });
  const [otpValue, setOtpValue] = useState("");
  const [animateOut, setAnimateOut] = useState(false);
  const [otpShake, setOtpShake] = useState(false);

  // Usamos el login expuesto por el contexto (similar al ejemplo que compartiste)
  const { login } = useAuth();
  const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;
  const apiFrontend = import.meta.env.VITE_REACT_FRONTEND_API_URL;

  

  async function handleCheckCredentials(values: FormValues) {
    try {
      const response = await fetch(`${apiUrl}/api/v1/check-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        credentials: "include",
      });

      if (response.ok) {
        setValidatedCredentials({
          username: values.username,
          password: values.password,
        });
        setCustomAlert({ type: "", message: "" });
        // Activa la animación de salida en el Step1 y pasa al Step2
        setAnimateOut(true);
        setTimeout(() => {
          setStep(2);
          setAnimateOut(false);
        }, 500);
      } else {
        const errorData = await response.json();
        setCustomAlert({
          type: "error",
          message: errorData.msg || "Error al verificar credenciales",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setCustomAlert({
        type: "error",
        message: "Hubo un problema con el servidor al verificar credenciales",
      });
    }
  }

  async function handleValidateOTP() {
    if (!validatedCredentials) {
      setCustomAlert({
        type: "error",
        message: "No tenemos un usuario validado. Reintenta iniciar sesión.",
      });
      setStep(1);
      return;
    }

    try {
      // Se llama a login del contexto, de forma similar al ejemplo sencillo,
      // pero pasando username, password y el otpValue que se obtiene del input.
      const success = await login(validatedCredentials.username, validatedCredentials.password, otpValue);
      if (success) {
        // Redirigir al home del usuario después de login exitoso
        window.location.href = `${apiFrontend}/`;
      } else {
        setCustomAlert({
          type: "error",
          message: "Error al verificar OTP",
        });
        setOtpShake(true);
        setTimeout(() => setOtpShake(false), 500);
      }
    } catch (error) {
      console.error("Error:", error);
      setCustomAlert({
        type: "error",
        message: "Hubo un problema con el servidor al verificar el OTP",
      });
      setOtpShake(true);
      setTimeout(() => setOtpShake(false), 500);
    }
  }

  return (
    <div className="relative w-full max-w-xs h-[32rem]">
      {step === 1 && (
        <LoginStep1
          animateOut={animateOut}
          onCheckCredentials={handleCheckCredentials}
          customAlert={customAlert}
        />
      )}
      {step === 2 && (
        <LoginStep2
          otpValue={otpValue}
          setOtpValue={setOtpValue}
          onValidateOTP={handleValidateOTP}
          customAlert={customAlert}
          shake={otpShake}
        />
      )}
    </div>
  );
}
