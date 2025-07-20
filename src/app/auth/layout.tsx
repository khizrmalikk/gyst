import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F2F0EF]">
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center">
        <Link href="/" className="flex items-center justify-center space-x-2">
          <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
            <span className="text-[#F2F0EF] font-bold text-xl">G</span>
          </div>
          <span className="text-3xl font-bold text-black">GYST</span>
        </Link>
        <p className="mt-2 text-[#66615E]">Get Your Shit Together</p>
      </div>
      {children}
    </div>
  );
} 