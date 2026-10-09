import math
import hashlib
import re
from typing import List
import httpx
from backend.app.config import settings

class EmbeddingProvider:
    DIMENSION = 384

    def __init__(self):
        self.ollama_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.model = "bge-m3"

    def embed_text(self, text: str) -> List[float]:
        # Try Ollama if running
        try:
            r = httpx.post(
                f"{self.ollama_url}/api/embeddings",
                json={"model": self.model, "prompt": text},
                timeout=1.5
            )
            if r.status_code == 200:
                emb = r.json().get("embedding", [])
                if emb:
                    return emb[:self.DIMENSION]
        except Exception:
            pass

        # Deterministic local n-gram frequency hash vector
        vec = [0.0] * self.DIMENSION
        clean = re.sub(r"[^\w\s]", " ", text.lower())
        tokens = clean.split()
        if not tokens:
            return vec

        for token in tokens:
            # Word level
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest()[:8], 16) % self.DIMENSION
            vec[h] += 1.0
            # 3-gram character subwords
            for i in range(len(token) - 2):
                tri = token[i:i+3]
                h_tri = int(hashlib.md5(tri.encode("utf-8")).hexdigest()[:8], 16) % self.DIMENSION
                vec[h_tri] += 0.5

        # L2 normalize
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        if not vec_a or not vec_b:
            return 0.0
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return max(0.0, min(1.0, dot / (norm_a * norm_b)))

embedding_provider = EmbeddingProvider()
