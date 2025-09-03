
export const metadata = { title: "Einkaufsliste", description: "Shopping List App" };

export default function RootLayout({ children }) {
    return (
        <html lang="de">
        <body style={{ margin: 0, background: "#fff", color: "#111827", fontFamily: "-apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}>
        {children}
        </body>
        </html>
    );
}
