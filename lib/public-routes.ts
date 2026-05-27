export function isRotaPublica(pathname: string): boolean {
  return (
    pathname.startsWith('/agendar') ||
    pathname.startsWith('/redefinir-senha') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/cancelar') ||
    pathname === '/login' ||
    pathname === '/esqueci-senha' ||
    pathname === '/termos' ||
    pathname === '/privacidade'
  )
}
