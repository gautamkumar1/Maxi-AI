import { inngest } from "./client";
import { createAgent, openai } from '@inngest/agent-kit';
import { Sandbox } from '@e2b/code-interpreter'
import { getSandbox } from "./utils";
export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event,step }) => {
    // e2b:code-interpreter -> Sandbox
    const sandboxId = await step.run("get-sandbox-id",async ()=>{
      const sandbox = await Sandbox.create("maxi-nextjs-test")
      return sandbox.sandboxId;
    })


    const codeAgent = createAgent({
      name: 'codeAgent',
      system: 'You are an expert next js developer. You write readable, maintainable, and efficient code. You write simple Next.js & React snippets.',
      model: openai({ model: "gpt-4o", }),
    });
    const { output } = await codeAgent.run(
      `write the following snippet: ${event.data.email}`,
    );

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId)
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    })
    
    return { output,sandboxUrl };
  },
);
