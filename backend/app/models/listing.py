from pydantic import BaseModel, Field


class Listing(BaseModel):
    id: str
    title: str
    price: int
    currency: str = "INR"
    location: str
    description: str
    seller_name: str
    seller_rating: float | None = Field(default=None, ge=0, le=5)
    image_url: str
    listing_url: str
    source: str
    condition: str
    posted_time: str
    data_source: str = "mock_fallback"
    product_key: str

