import { caller } from "@/trpc/server";


export default async function Home() {
  const data = await caller.createAI({
    text: "Hello, world!",})
  return (
   <div>
      {JSON.stringify(data)}
   </div>
  );
}
