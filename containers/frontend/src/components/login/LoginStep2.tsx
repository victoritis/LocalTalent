import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";

interface LoginStep2Props {
  otpValue: string;
  setOtpValue: (value: string) => void;
  onValidateOTP: () => void;
  customAlert: { type: "" | "success" | "error"; message: string };
  shake?: boolean;
}

export function LoginStep2({ setOtpValue, onValidateOTP, customAlert, shake = false }: LoginStep2Props) {
  const [animateIn, setAnimateIn] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimateIn(false);
    }, 50);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      className={`absolute inset-0 transition-all duration-500 ${
        animateIn ? "opacity-0 translate-x-full" : "opacity-100 translate-x-0"
      } ${shake ? "shake" : ""}`}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Encabezado */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Verificación de 2FA</h1>
          <p className="text-sm text-muted-foreground">
            Ingresa tu código OTP para completar el inicio de sesión
          </p>
        </div>

        {/* Alertas */}
        {customAlert.type && (
          <Alert
            variant={customAlert.type === "success" ? "default" : "destructive"}
            className="mb-4"
          >
            {customAlert.type === "success" ? (
              <>
                <Terminal className="h-4 w-4" />
                <AlertTitle>¡Éxito!</AlertTitle>
                <AlertDescription>{customAlert.message}</AlertDescription>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{customAlert.message}</AlertDescription>
              </>
            )}
          </Alert>
        )}

        {/* Input para OTP centrado */}
        <div className="my-4 flex justify-center w-full">
          <InputOTP
            data-testid="otp-input"
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            onChange={(value) => setOtpValue(value)}
            containerClassName="cursor-text"
          >
            <InputOTPGroup>
              <InputOTPSlot data-testid="otp-slot-0" index={0} />
              <InputOTPSlot data-testid="otp-slot-1" index={1} />
              <InputOTPSlot data-testid="otp-slot-2" index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot data-testid="otp-slot-3" index={3} />
              <InputOTPSlot data-testid="otp-slot-4" index={4} />
              <InputOTPSlot data-testid="otp-slot-5" index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button onClick={onValidateOTP} data-testid="validate-otp-button" className="w-full">
          Validar OTP
        </Button>
      </div>
    </div>
  );
}
