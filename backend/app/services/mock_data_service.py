import json
from pathlib import Path

from app.models.listing import Listing


DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "mock_listings.json"


class MockDataService:
    def __init__(self, data_path: Path = DATA_PATH) -> None:
        self.data_path = data_path

    def list_products(self) -> list[dict[str, str]]:
        data = self._load_data()
        return [
            {
                "key": item["key"],
                "label": item["label"],
                "goal": item["goal"],
            }
            for item in data["products"]
        ]

    def search(self, user_goal: str) -> tuple[str, int | None, list[Listing]]:
        product_key = detect_product_key(user_goal)
        budget = detect_budget(user_goal)
        data = self._load_data()
        product = next((item for item in data["products"] if item["key"] == product_key), data["products"][0])
        listings = [Listing(**item) for item in product["listings"]]
        return product["label"], budget, listings

    def _load_data(self) -> dict:
        with self.data_path.open("r", encoding="utf-8") as file:
            return json.load(file)


def detect_product_key(user_goal: str) -> str:
    text = user_goal.lower()
    if "ps5" in text or "playstation" in text:
        return "ps5"
    if "macbook" in text or "mac book" in text:
        return "macbook"
    return "iphone14"


def detect_budget(user_goal: str) -> int | None:
    digits = "".join(ch if ch.isdigit() else " " for ch in user_goal)
    numbers = [int(part) for part in digits.split() if part.isdigit()]
    if not numbers:
        return None
    return max(numbers)

