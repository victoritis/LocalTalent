const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

export async function checkIfLoggedIn() {
  try {
    const response = await fetch(`${apiUrl}/api/v1/is-loged`, {
      method: "POST",
      credentials: "include", // Incluye las cookies
    });
    if (response.ok) {
      const data = await response.json();
      return data.logged_in;
    } else {
      console.error("Error al verificar si está logueado:", response.status);
      return false;
    }
  } catch (error) {
    console.error("Error en la solicitud:", error);
    return false;
  }
}

export async function loginUser(username: string, password: string, otpCode: string): Promise<{ success: boolean; msg?: string }> {
  try {
    const response = await fetch(`${apiUrl}/api/v1/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        otp_code: otpCode,
      }),
      credentials: "include",
    });
    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json();
      console.error("Error al verificar OTP:", errorData.msg || "Error en la verificación");
      return { success: false, msg: errorData.msg };
    }
  } catch (error) {
    console.error("Error en la solicitud de login:", error);
    return { success: false, msg: "Error en la solicitud" };
  }
}

export async function logoutUser(): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${apiUrl}/api/v1/logout`, {
      method: "POST",
      credentials: "include",
    });
    if (response.ok) {
      return { success: true };
    } else {
      console.error("Error al cerrar sesión:", response.status);
      return { success: false };
    }
  } catch (error) {
    console.error("Error en la solicitud de logout:", error);
    return { success: false };
  }
}
