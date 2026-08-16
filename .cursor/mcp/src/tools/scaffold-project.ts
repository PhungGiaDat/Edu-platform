// src/tools/scaffold-project.ts
//
// MCP tool: generate a starter MindAR project in a target directory.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const InputSchema = z.object({
  stack: z.enum(['vanilla-threejs', 'aframe', 'react-threejs', 'typescript-vite'])
    .describe('Starter stack: vanilla-threejs | aframe | react-threejs | typescript-vite'),
  projectName: z.string().min(1).regex(/^[a-z0-9-_]+$/, 'lowercase letters, numbers, hyphens, underscores only')
    .describe('Project directory name (lowercase, no spaces)'),
  targetDir: z.string().min(1).describe('Absolute path where the project directory will be created'),
}).strict();

type Input = z.infer<typeof InputSchema>;

const TEMPLATES: Record<string, Record<string, string>> = {
  'vanilla-threejs': {
    'package.json': `{
  "name": "<NAME>",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --https",
    "build": "vite build",
    "preview": "vite preview --https"
  },
  "dependencies": {
    "mind-ar": "^1.2.5",
    "three": "^0.160.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
`,
    'vite.config.js': `import { defineConfig } from 'vite';
export default defineConfig({
  server: { https: true, host: '0.0.0.0' },
  build: { target: 'es2020' }
});
`,
    'index.html': `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
  <title><NAME></title>
  <style>html,body,#container{margin:0;height:100%;overflow:hidden;background:#000}</style>
</head>
<body>
  <div id="container"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
`,
    'src/main.js': `import { MindARThree } from 'mind-ar/dist/mindar-three.js';

const mindarThree = new MindARThree({
  container: document.querySelector('#container'),
  imageTargetSrc: '/targets/targets.mind'
});

const anchor = mindarThree.addAnchor(0);
anchor.onTargetFound = () => console.log('target found');
anchor.onTargetLost  = () => console.log('target lost');

await mindarThree.start();
mindarThree.renderer.setAnimationLoop(() => {
  mindarThree.renderer.render(mindarThree.scene, mindarThree.camera);
});
`,
    'README.md': `# <NAME>

MindAR starter project. Stack: vanilla Three.js.

## Setup

1. \`npm install\`
2. Add compiled \`targets.mind\` to \`public/targets/\`
3. \`npm run dev\`

The dev server runs with HTTPS at https://localhost:5173.
`,
  },
  'aframe': {
    'package.json': `{
  "name": "<NAME>",
  "private": true,
  "scripts": {
    "dev": "npx http-server -S -C cert.pem .",
    "build": "echo 'static only'"
  }
}
`,
    'index.html': `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><NAME></title>
  <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-aframe.js"></script>
  <style>html,body{margin:0;overflow:hidden;background:#000}</style>
</head>
<body>
  <a-scene mindar-image="imageTargetSrc: /targets/targets.mind"
           color-space="sRGB" vr-mode-ui="enabled: false"
           device-orientation-permission-ui="enabled: false">
    <a-camera position="0 0 0"></a-camera>
    <a-entity mindar-image-target="targetIndex: 0">
      <a-gltf-model src="/assets/model.glb" position="0 0 0" scale="0.1 0.1 0.1"></a-gltf-model>
    </a-entity>
  </a-scene>
</body>
</html>
`,
    'README.md': `# <NAME>

MindAR + A-Frame starter.

## Setup

1. Place a compiled \`targets.mind\` at \`public/targets/\`
2. Place a \`model.glb\` at \`public/assets/\`
3. Generate a dev cert: \`mkcert localhost\`
4. \`npm run dev\`
`,
  },
  'react-threejs': {
    'package.json': `{
  "name": "<NAME>",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --https",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "mind-ar": "^1.2.5",
    "three": "^0.160.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0",
    "typescript": "^5.3.0"
  }
}
`,
    'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { https: true, host: '0.0.0.0' }
});
`,
    'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "lib": ["ES2020", "DOM"]
  },
  "include": ["src"]
}
`,
    'index.html': `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><NAME></title>
  <style>html,body,#root{margin:0;height:100%;overflow:hidden;background:#000}</style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
`,
    'src/main.tsx': `import React from 'react';
import { createRoot } from 'react-dom/client';
import { MindARScene } from './MindARScene';

createRoot(document.getElementById('root')!).render(<MindARScene targetSrc="/targets/targets.mind" />);
`,
    'src/MindARScene.tsx': `import { useEffect, useRef } from 'react';
import { MindARThree } from 'mind-ar/dist/mindar-three.js';

export function MindARScene({ targetSrc }: { targetSrc: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const mindarThree = new MindARThree({ container: containerRef.current, imageTargetSrc: targetSrc });
    mindarThree.addAnchor(0);

    mindarThree.start().then(() => {
      mindarThree.renderer.setAnimationLoop(() => {
        mindarThree.renderer.render(mindarThree.scene, mindarThree.camera);
      });
    });

    return () => {
      mindarThree.renderer.setAnimationLoop(null);
      mindarThree.stop();
      mindarThree.renderer.dispose();
    };
  }, [targetSrc]);

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />;
}
`,
    'README.md': `# <NAME>

MindAR + React + Three.js starter.

## Setup

1. \`npm install\`
2. Add \`targets.mind\` to \`public/targets/\`
3. \`npm run dev\`
`,
  },
  'typescript-vite': {
    'package.json': `{
  "name": "<NAME>",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --https",
    "build": "tsc && vite build"
  },
  "dependencies": {
    "mind-ar": "^1.2.5",
    "three": "^0.160.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.3.0"
  }
}
`,
    'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "lib": ["ES2020", "DOM"],
    "types": ["vite/client"]
  },
  "include": ["src"]
}
`,
    'index.html': `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><NAME></title>
  <style>html,body,#container{margin:0;height:100%;overflow:hidden;background:#000}</style>
</head>
<body>
  <div id="container"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
`,
    'src/main.ts': `import { MindARThree } from 'mind-ar/dist/mindar-three.js';

const mindarThree = new MindARThree({
  container: document.querySelector('#container')!,
  imageTargetSrc: '/targets/targets.mind'
});
mindarThree.addAnchor(0);

await mindarThree.start();
mindarThree.renderer.setAnimationLoop(() => {
  mindarThree.renderer.render(mindarThree.scene, mindarThree.camera);
});
`,
    'README.md': `# <NAME>

MindAR + TypeScript + Vite starter.

## Setup

1. \`npm install\`
2. Add \`targets.mind\` to \`public/targets/\`
3. \`npm run dev\`
`,
  },
};

export function registerScaffoldProject(server: McpServer) {
  server.registerTool(
    'mindar_scaffold_project',
    {
      title: 'Scaffold MindAR Project',
      description: `Generate a starter MindAR project in targetDir.

Creates package.json, index.html, src/main.{js,ts}, README.md, and any
supporting config files for the chosen stack.

Args:
  - stack: 'vanilla-threejs' | 'aframe' | 'react-threejs' | 'typescript-vite'
  - projectName: lowercase letters/numbers/hyphens/underscores
  - targetDir: absolute path where project directory will be created

Returns: list of files created.

Common Errors:
  - "directory already exists": choose a different projectName or targetDir
  - "stack not supported": use one of the four listed above`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params: Input) => {
      const template = TEMPLATES[params.stack];
      if (!template) {
        return { content: [{ type: 'text', text: `Error: stack '${params.stack}' not supported` }] };
      }

      const projectPath = path.join(params.targetDir, params.projectName);
      try {
        await fs.access(projectPath);
        return { content: [{ type: 'text', text: `Error: directory already exists: ${projectPath}` }] };
      } catch {
        // OK — directory doesn't exist
      }

      await fs.mkdir(projectPath, { recursive: true });
      const created: string[] = [];

      for (const [relPath, content] of Object.entries(template)) {
        const fullPath = path.join(projectPath, relPath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content.replace(/<NAME>/g, params.projectName), 'utf-8');
        created.push(relPath);
      }

      return {
        content: [{
          type: 'text',
          text: [
            `Created MindAR starter (${params.stack}) at ${projectPath}`,
            '',
            'Files:',
            ...created.map(f => `  - ${f}`),
            '',
            'Next steps:',
            `  cd ${params.projectName}`,
            `  npm install`,
            `  # add targets.mind to public/targets/`,
            `  npm run dev`,
          ].join('\n'),
        }],
        structuredContent: { projectPath, files: created },
      };
    }
  );
}