$ErrorActionPreference='Stop'
$root=(Get-Location).Path
$items=@('app','db','drizzle','lib','components','hooks','build','scripts','vendor','contracts','examples','drizzle.config.ts','package.json','package-lock.json','tsconfig.json','vite.config.ts','next.config.ts','postcss.config.mjs','eslint.config.mjs','cloudflare-env.d.ts','components.json','README.md','next-env.d.ts','.openai/hosting.json','.gitignore','.npmrc','public/favicon.svg')
$target=Join-Path $root 'public/source.zip'
$stream=[IO.File]::Open($target,[IO.FileMode]::Create)
$zip=[IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create)
try {
 foreach($item in $items){
  $files=Get-ChildItem -LiteralPath (Join-Path $root $item) -File -Recurse
  foreach($file in $files){
   $relative=[IO.Path]::GetRelativePath($root,$file.FullName).Replace('\','/')
   $entry=$zip.CreateEntry($relative)
   $dest=$entry.Open();$src=$file.OpenRead()
   try{$src.CopyTo($dest)}finally{$src.Dispose();$dest.Dispose()}
  }
 }
}finally{$zip.Dispose();$stream.Dispose()}
Write-Output 'Source ZIP created with relative directory structure; runtime data excluded.'

