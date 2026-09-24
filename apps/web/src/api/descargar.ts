const BASE_URL = import.meta.env.VITE_API_URL;

// GET simple con <a href> no sirve para /export/*: el endpoint exige el JWT en el header
// Authorization, así que hay que traer el archivo como blob y disparar la descarga a mano.
export async function descargarArchivo(ruta: string, token: string, nombreArchivo: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${ruta}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("No se pudo descargar el archivo.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
