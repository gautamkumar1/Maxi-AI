"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";


export default function Home() {
  const [value, setValue] = useState("");
  const trpc = useTRPC()
  const invoke = useMutation(trpc.invoke.mutationOptions({
    onSuccess: (data) => {
      toast.success("Background job started successfully!");
    }
  }))
  return (
   <div>
    <Input value={value} onChange={(e)=> setValue(e.target.value)} className="w-1/2 mt-10"/>
    <Button disabled={invoke.isPending} onClick={()=> invoke.mutate({ text: value })}>Invoke Background job</Button>
   </div>
  );
}
