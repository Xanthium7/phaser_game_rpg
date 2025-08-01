"use client";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function Page() {
  return (
    <div className="min-h-screen flex">
      {/* Global styles to hide Clerk banners and social providers */}
      <style jsx global>{`
        .cl-internal-b3fm6y,
        .cl-footer,
        .cl-modalCloseButton,
        .cl-developmentBanner,
        .cl-internal-1ta6rch,
        .cl-internal-1vfjj7t,
        .cl-socialButtonsBlockButton {
          display: none !important;
        }
      `}</style>{" "}
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div
          className="w-full bg-cover bg-center bg-gray-900"
          style={{
            backgroundImage: "url('/bg.gif')",
          }}
        >
          {/* Black opacity overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-30"></div>

          {/* Centered welcome text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              <h1 className="text-5xl font-bold mb-4">
                Welcome Back to CHILL-VERSE
              </h1>
              <p className="text-xl opacity-90">
                Continue your adventure in our virtual world
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Right side - Enhanced Form */}
      <div className="w-full lg:w-1/2 bg-[#161616] flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Custom Header */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-3">
              Sign in to 2Dverse
            </h2>
            <p className="text-gray-400 mb-6">
              Welcome back! Please sign in to continue
            </p>
            {/* Sign up link */}
            <p className="text-gray-400">
              Don&apos;t have an account?{" "}
              <Link
              href="/sign-up"
              className="text-purple-400 hover:text-purple-300 underline font-semibold"
              >
              Sign up
              </Link>
            </p>{" "}
          </div>

          {/* Modern Card Container */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-2xl p-8 shadow-2xl">
            <div className="flex justify-center">
              <SignIn
                appearance={{
                  elements: {
                    rootBox: "w-full flex justify-center",
                    card: "bg-[#161616] shadow-none border-none w-full",
                    headerTitle: "hidden", // Hide default title since we have custom
                    headerSubtitle: "hidden", // Hide default subtitle
                    dividerLine: "bg-gray-600",
                    dividerText: "text-gray-400",
                    formFieldLabel: "text-gray-300 font-medium mb-2",
                    formFieldInput:
                      "bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-4 py-3 transition-all duration-200 backdrop-blur-sm",
                    formButtonPrimary:
                      "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-purple-500/25 transform hover:scale-[1.02]",
                    identityPreviewText: "text-gray-300",
                    identityPreviewEditButton:
                      "text-purple-400 hover:text-purple-300",
                    formResendCodeLink: "text-purple-400 hover:text-purple-300",
                    otpCodeFieldInput:
                      "bg-gray-700/50 border-gray-600 text-white rounded-xl",
                    alternativeMethodsBlockButton:
                      "text-purple-400 hover:text-purple-300",
                    footer: "hidden",
                    footerAction: "hidden",
                    footerActionText: "hidden",
                    internal: "hidden",
                    socialButtonsBlockButton: "hidden",
                    socialButtonsBlockButtonText: "hidden",
                    socialButtonsProviderIcon: "hidden",
                    dividerRow: "hidden",
                  },
                  layout: {
                    socialButtonsPlacement: "bottom",
                    showOptionalFields: true,
                  },
                  variables: {
                    colorPrimary: "#9333ea",
                    colorBackground: "transparent",
                    colorInputBackground: "rgba(31, 36, 44, 0.836)",
                    colorInputText: "#ffffff",
                    colorText: "#ffffff",
                    colorTextSecondary: "#9ca3af",
                    borderRadius: "0.75rem",
                    spacingUnit: "1rem",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
