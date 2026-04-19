import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LifeBuoy, ShieldAlert } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

export function SupportPage() {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto py-10 px-4 flex justify-center items-start">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center text-2xl">
            <LifeBuoy className="mr-3 h-7 w-7 text-primary" aria-hidden="true" />
            {t("support.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert variant="default" className="bg-amber-50 border-amber-300 text-amber-800">
            <ShieldAlert className="h-5 w-5 !text-amber-700" aria-hidden="true" />
            <AlertTitle className="font-semibold text-lg !text-amber-900">
              {t("support.unavailableTitle")}
            </AlertTitle>
            <AlertDescription className="mt-2 text-base">
              {t("support.unavailableIntro")}
              <br /><br />
              <Trans
                i18nKey="support.contactAdmin"
                components={{ strong: <strong /> }}
              />
              <br /><br />
              {t("support.thanks")}
            </AlertDescription>
          </Alert>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">{t("support.teamSignature")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
