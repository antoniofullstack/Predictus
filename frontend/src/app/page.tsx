import Link from 'next/link';

export default function Home() {
  return (
    <div className="w-full max-w-md mx-auto text-center space-y-8">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold text-primary-900">Predictus</h1>
        <p className="text-gray-500">Sistema de Cadastro</p>
      </div>
      <Link
        href="/cadastro"
        className="inline-block w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
      >
        Iniciar Cadastro
      </Link>
    </div>
  );
}
