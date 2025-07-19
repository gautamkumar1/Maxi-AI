import { inngest } from "./client";
import { createAgent, createNetwork, createTool, openai } from '@inngest/agent-kit';
import { Sandbox } from '@e2b/code-interpreter'
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { z } from "zod";
import { PROMPT } from "@/prompt";
import { url } from "inspector";
import { title } from "process";
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
      system: PROMPT,
      description: "An expert coding agent",
      model: openai({ model: "gpt-4.1",defaultParameters: { temperature: 0.1 } }),
      tools: [
        // Tool 1 -> Use the terminal to run commands
        createTool({
          name:"terminal",
          description: "Use the terminal to run commands",
          parameters: z.object({
            command: z.string()
          }),
          handler: async ({command},{step}) =>{
            return await step?.run("terminal",async()=>{
              const buffers = {stdout:"",stderr:""};
              try {
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(command,{
                  onStdout: (data) => {
                    buffers.stdout += data;
                  },
                  onStderr: (data) => {
                    buffers.stderr += data;
                  }
                })
                return result.stdout;
              } catch (error) {
                console.error(`Command failed: ${error}\nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}`);
                return `Command failed: ${error}\nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}`;
              }
            })
          }
        }),

        // Tool 2 -> Create or update a file in the sandbox
      createTool({
        name:"createOrUpdateFile",
        description: "Create or update a file in the sandbox",
        parameters: z.object({
          files: z.array(
            z.object({
              path: z.string(),
              content: z.string(),
            })
          )
        }),
        handler: async ({files},{step,network})=>{
          const newFiles = await step?.run("create-or-update-file",async()=>{
            try {
            const updateFiles = network.state.data.files || {};
            const sandbox = await getSandbox(sandboxId);
            for (const file of files) {
              await sandbox.files.write(file.path, file.content);
              updateFiles[file.path] = file.content;
            }
            return updateFiles;
            } catch (error) {
              console.error(`Error: ${error}`);
              return `Error: ${error}`;
            }
          })
          if(typeof newFiles === "object"){
            network.state.data.files = newFiles;
          }
        }
      }),

      // Tool 3 -> Read a file from the sandbox
      createTool({
        name: "readFile",
        description: "Read a file from the sandbox",
        parameters: z.object({
          files: z.array(
            z.string()
          )
        }),
        handler: async ({files},{step}) =>{
          return await step?.run("readFile",async ()=>{
            try {
              const sandbox = await getSandbox(sandboxId);
              const contents = [];
              for (const file of files) {
                const content = await sandbox.files.read(file);
                contents.push({ path: file, content });
              }
              return JSON.stringify(contents);
            } catch (error) {
              return `Error reading files: ${error}`;
            }
          })
        }
      })

      ],

      lifecycle:{
        onResponse: async ({result,network})=>{
          const lastAssistantTextMessageText = lastAssistantTextMessageContent(result);
          if(lastAssistantTextMessageText && network){
            if(lastAssistantTextMessageText.includes("<task_summary>")){
              network.state.data.summary = lastAssistantTextMessageText;
            }
          }
          return result;
        }
      }
    });

    const network = createNetwork({
      name: "coding-agent-network",
      agents: [codeAgent],
      maxIter:15,
      router: async ({network})=>{
        const summary = network.state.data.summary;
        if(summary){
          return;
        }
        return codeAgent;
      }
    })
    
    const result = await network.run(event.data.email)

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId)
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    })
    
    return { url:sandboxUrl,title: "Fragment",files: result.state.data.files,summary:result.state.data.summary};
  },
);
