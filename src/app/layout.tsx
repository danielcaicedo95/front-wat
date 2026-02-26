// app/layout.tsx
import './globals.css';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';

export const metadata = {
  title: 'WappBot Dashboard',
  description: 'Panel de gestión de chatbot e inventario',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-gray-800">
        <Sidebar />
        <div className="pt-16 md:ml-64 min-h-screen flex flex-col bg-gray-100">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4">{children}</main>
        </div>
      </body>
    </html>
  );
}
