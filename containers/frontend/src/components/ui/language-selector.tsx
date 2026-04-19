import { useTranslation } from "react-i18next"
import { Languages } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LANGUAGES } from "@/i18n"

export function LanguageSelector() {
  const { t, i18n } = useTranslation()
  const current = LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ?? LANGUAGES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t("language.label")}
          className="gap-2"
        >
          <Languages aria-hidden="true" className="h-4 w-4" />
          <span className="uppercase text-xs font-medium">{current.code}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => {
              i18n.changeLanguage(lang.code)
            }}
            aria-current={lang.code === current.code ? "true" : undefined}
          >
            <span className="uppercase mr-2 text-xs">{lang.code}</span>
            {t(lang.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
