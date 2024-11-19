import Game from "@/components/Game";

async function Page({ params }: { params: { userId: string } }) {
  const { userId } = await params;
  return (
    <div className="flex h-screen w-screen flex-col justify-center items-center  ">
      <h1 className="font-semibold">Loading YEAH</h1>
      <h1 className="text-3xl">id: {userId}</h1>

      <Game userId={userId} />
    </div>
  );
}

export default Page;
