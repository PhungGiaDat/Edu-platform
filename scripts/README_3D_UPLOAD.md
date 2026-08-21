# 3D Model Upload Scripts

## Quick Upload (Small files < 50MB)

```bash
python scripts/upload_ragdoll_3d.py
```

## Large File Upload (TUS Protocol)

For files > 50MB, use the TUS resumable upload:

```bash
python scripts/upload_tus_ragdoll.py
```

## Manual Upload via Supabase Dashboard

1. Go to Supabase Storage: https://app.supabase.com/project/rofprrtoeyirssfndxag/storage
2. Navigate to AR_models bucket
3. Upload files to 3dmodel/ folder

## URLs

- **Master (desktop)**: https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_master.glb
- **Mobile (optimized)**: https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb

## Database Update

After uploading, update the database:

```sql
UPDATE public.ar_objects 
SET model_3d_url = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb'
WHERE ar_tag = 'your_tag';
```
