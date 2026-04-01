import Link from 'next/link';
import Button from '@/components/ui/Button';

function PredictusLogo() {
  return (
    <svg width="100" height="100" viewBox="0 0 41 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.0921 0V13.3318H0.760254V33.3341H7.42615V40H14.1036C21.4501 40 27.4285 34.0216 27.4285 26.6751V26.6682H34.0944V20.0023H40.7603V0H14.0921ZM24.0921 22.7616C21.2547 21.7567 19.0059 19.5056 18.001 16.6705H24.0921V22.7616ZM14.1036 36.6659H10.7626V30H4.09666V16.6705H14.5129C15.72 21.3497 19.4129 25.0425 24.0921 26.2497V26.6774C24.0921 32.1844 19.6106 36.6659 14.1036 36.6659ZM37.4239 16.6659H30.758V23.3318H27.4285V13.3318H17.4285V3.3364H37.4239V16.6659Z" fill="#45A874"/>
    </svg>
  );
}

export default function Home() {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-6 py-6">
      <div className="flex items-center justify-center gap-2 mb-8">
        <span className="w-8 h-2 rounded-full bg-primary-500" />
        <span className="w-2 h-2 rounded-full bg-gray-300" />
        <span className="w-2 h-2 rounded-full bg-gray-300" />
      </div>

      <div className="w-full mb-10">
        <div className="w-full h-48 rounded-3xl flex items-center justify-center bg-[#F4F3EE]">
          <PredictusLogo />
        </div>
      </div>

      <h1 className="text-4xl font-bold text-primary-900 leading-tight mb-4">
        Predictus,<br />seu futuro financeiro mapeado.
      </h1>

      <p className="text-gray-500 text-base leading-relaxed mb-10">
        Previsão inteligente e gestão integrada para construção de patrimônio moderno.
      </p>

      <div className="flex-1" />

      <Link href="/cadastro" className="mb-4 block">
        <Button> Criar cadastro </Button>
      </Link>

      <p className="text-center text-xs text-gray-400 pb-4">
        Ao continuar, você concorda com nossos{' '}
        <Link href="#" className="underline hover:text-gray-600">Termos</Link> e{' '}
        <Link href="#" className="underline hover:text-gray-600">Política de Privacidade</Link>.
      </p>
    </div>
  );
}
