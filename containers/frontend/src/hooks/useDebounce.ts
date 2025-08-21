import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Actualizar valor debounced después del delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpiar el timeout si el valor cambia (o al desmontar)
    // Esto asegura que si el usuario sigue escribiendo, el valor anterior no se establece
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Solo re-ejecutar si value o delay cambian

  return debouncedValue;
}
