import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F2F0EF]">
      <SignIn 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-white shadow-lg rounded-lg border border-[#C9C8C7]",
            headerTitle: "text-black font-bold",
            headerSubtitle: "text-[#66615E]",
            socialButtonsBlockButton: "border-[#C9C8C7] text-[#66615E] hover:bg-[#F2F0EF] hover:text-black",
            formButtonPrimary: "bg-black hover:bg-[#66615E] text-[#F2F0EF]",
            formFieldInput: "border-[#C9C8C7] focus:border-black focus:ring-black",
            formFieldLabel: "text-[#66615E]",
            footerActionLink: "text-black hover:text-[#66615E]",
          },
        }}
        signUpUrl="/auth/signup"
        redirectUrl="/pages/search"
      />
    </div>
  );
} 