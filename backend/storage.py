import os
import shutil
from typing import Optional

class StorageInterface:
    def upload_file(self, local_path: str, destination_path: str) -> str:
        raise NotImplementedError()

    def get_signed_url(self, destination_path: str) -> str:
        raise NotImplementedError()


class LocalStorage(StorageInterface):
    def __init__(self, base_dir: str = "./tmp/storage", base_url: str = "/static"):
        self.base_dir = base_dir
        self.base_url = base_url
        os.makedirs(self.base_dir, exist_ok=True)

    def upload_file(self, local_path: str, destination_path: str) -> str:
        dest_full_path = os.path.join(self.base_dir, destination_path)
        os.makedirs(os.path.dirname(dest_full_path), exist_ok=True)
        shutil.copy2(local_path, dest_full_path)
        return self.get_signed_url(destination_path)

    def get_signed_url(self, destination_path: str) -> str:
        # Returns a relative path. The API router will prepend the server base URL if needed,
        # or the frontend can request it relative to the API root.
        # Ensure forward slashes for URLs
        clean_path = destination_path.replace("\\", "/")
        return f"{self.base_url}/{clean_path}"


class R2Storage(StorageInterface):
    def __init__(self, account_id: str, access_key: str, secret_key: str, bucket_name: str):
        import boto3
        self.bucket_name = bucket_name
        self.client = boto3.client(
            "s3",
            endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name="auto" # Cloudflare R2 requires region_name='auto' or similar
        )

    def upload_file(self, local_path: str, destination_path: str) -> str:
        clean_path = destination_path.replace("\\", "/")
        extra_args = {}
        if local_path.endswith(".mp3"):
            extra_args["ContentType"] = "audio/mpeg"
        elif local_path.endswith(".json"):
            extra_args["ContentType"] = "application/json"
            
        self.client.upload_file(
            local_path,
            self.bucket_name,
            clean_path,
            ExtraArgs=extra_args
        )
        return self.get_signed_url(clean_path)

    def get_signed_url(self, destination_path: str) -> str:
        clean_path = destination_path.replace("\\", "/")
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": clean_path},
            ExpiresIn=86400  # 24 hours
        )


def get_storage() -> StorageInterface:
    account_id = os.getenv("R2_ACCOUNT_ID")
    access_key = os.getenv("R2_ACCESS_KEY")
    secret_key = os.getenv("R2_SECRET_KEY")
    bucket_name = os.getenv("R2_BUCKET_NAME", "audiobooks")
    
    if account_id and access_key and secret_key:
        try:
            return R2Storage(account_id, access_key, secret_key, bucket_name)
        except Exception as e:
            print(f"Failed to connect to R2 storage: {e}. Falling back to LocalStorage.")
            
    return LocalStorage()
