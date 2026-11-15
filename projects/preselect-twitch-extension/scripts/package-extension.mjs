import { mkdir, rm, cp, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const output=resolve("dist/twitch-extension");
const configured=process.env.PICK_PREDICT_EBS_ORIGIN;
let origin;
try {
  const url=new URL(configured);
  if(url.protocol!=="https:"||url.username||url.password||url.pathname!=="/"||url.search||url.hash)throw new Error();
  origin=url.origin;
} catch { throw new Error("Set PICK_PREDICT_EBS_ORIGIN to the reviewed HTTPS backend origin before packaging. Packaging does not deploy that backend."); }
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await cp(resolve("public/twitch"),output,{recursive:true});
const script=resolve(output,"extension.js");
const source=await readFile(script,"utf8");
const marker='"https://twitchleagueplugin.vercel.app"';
if(!source.includes(marker))throw new Error("The extension backend-origin marker is missing.");
await writeFile(script,source.replace(marker,JSON.stringify(origin)));
const zip=resolve("dist/pick-predict-twitch-extension.zip");
await rm(zip,{force:true});
const result=spawnSync("zip",["-qr",zip,"."],{cwd:output,stdio:"inherit"});
if(result.status!==0)throw new Error("Could not create Extension ZIP. Install the zip command and retry.");
console.log(zip);
