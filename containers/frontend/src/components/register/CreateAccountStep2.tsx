import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router"; 

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";

import QRCode from "react-qr-code";

const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

const formSchema = z.object({
  otp: z
    .string()
    .min(6, "El código debe tener 6 dígitos")
    .max(6, "El código debe tener 6 dígitos"),
});

type FormValues = z.infer<typeof formSchema>;

interface Step2Props {
  formData: {
    username: string;
    password: string;
    confirmPassword: string;
    otp: string;
  };
  onChange: (field: string, value: string) => void;
  onBack: () => void;
}

export function CreateAccountStep2({ onBack }: Step2Props) {
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { otp: "" },
  });

  const [successMsg, setSuccessMsg] = React.useState("");
  const [otpValue, setOtpValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [qrUri, setQrUri] = React.useState("");
  const [otpSecret, setOtpSecret] = React.useState("");
  const [shake, setShake] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token") || "";

  React.useEffect(() => {
    if (!token) {
      console.error("Falta token en la URL para generar el QR");
      return;
    }

    fetch(`${apiUrl}/api/v1/otp-qr/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.msg || "Error al obtener QR");
        }
        return res.json();
      })
      .then((data) => {
        if (data.qr_uri) {
          setQrUri(data.qr_uri);
        }
        if (data.otp_secret) {
          setOtpSecret(data.otp_secret);
        }
      })
      .catch((error) => {
        console.error("No se pudo obtener el QR:", error);
      });
  }, [token]);

  const handleCopySecret = () => {
    navigator.clipboard.writeText(otpSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  async function handleValidateOTP() {
    const isValid = await form.trigger("otp");
    if (!isValid) return;

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/register-step2/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, otp_code: otpValue }),
      });

      if (response.ok) {
        setSuccessMsg("OTP verificado correctamente");
        setTimeout(() => navigate({ to: "/login" }), 2000); 
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (error) {
      console.error("Error al verificar OTP:", error);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card
        className={`p-6 rounded-xl shadow-2xl border border-black bg-white transition-transform duration-300 ${
          shake ? "transform scale-95" : "transform scale-100"
        }`}
      >
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-black text-center">
            Verificación de OTP
          </CardTitle>
          <CardDescription className="text-black text-center">
            Escanea el QR con tu app Authenticator y luego ingresa el código OTP
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 py-4">
          {successMsg && (
            <Alert variant="default">
              <Terminal className="h-4 w-4" />
              <AlertTitle>¡Éxito!</AlertTitle>
              <AlertDescription>{successMsg}</AlertDescription>
            </Alert>
          )}

          {qrUri && (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4">
                <QRCode value={qrUri} size={160} />
              </div>
              {otpSecret && (
                <div className="w-full max-w-md">
                  <Label className="text-black font-semibold text-sm mb-2 block text-center">
                    O introduce el código manualmente:
                  </Label>
                  <div className="flex items-center gap-2 bg-gray-100 p-3 rounded-lg border border-gray-300">
                    <code className="flex-1 text-center font-mono text-sm break-all">
                      {otpSecret}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopySecret}
                      className="shrink-0"
                    >
                      {copied ? "✓ Copiado" : "Copiar"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={form.handleSubmit(handleValidateOTP)} className="space-y-4">
            <div className="flex justify-center">
              <Label htmlFor="otp" className="text-black font-semibold text-center">
                OTP (6 dígitos)
              </Label>
            </div>
            <div className="flex justify-center p-2">
              <InputOTP
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                onChange={(value) => {
                  setOtpValue(value);
                  form.setValue("otp", value);
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onBack} className="px-4 py-2 border-black">
            Volver
          </Button>
          <Button onClick={handleValidateOTP} disabled={loading} className="px-4 py-2 border-black">
            {loading ? "Verificando..." : "Validar OTP"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
