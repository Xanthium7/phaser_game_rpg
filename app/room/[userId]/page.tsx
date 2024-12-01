// import Game from "@/components/Game";
import Room from "@/components/Game";

async function Page({ params }: { params: { userId: string } }) {
  const { userId } = await params;

  return (
    <div className="w-full h-full justify-center items-center flex overflow-hidden">
      <Room userId={userId}></Room>;
    </div>
  );
}

export default Page;
