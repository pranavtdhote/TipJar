import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="font-label-mono text-4xl font-bold text-[#b4d177] mb-4">404</div>
      <h1 className="text-2xl font-bold text-[#d8e5df] mb-2">Page Not Found</h1>
      <p className="text-sm text-[#9eb3aa] max-w-md mb-6">
        The requested resource or page does not exist on TipJar Protocol.
      </p>
      <Link href="/" className="btn-metamask text-xs py-3 px-6">
        Return to TipJar Home
      </Link>
    </div>
  );
}
