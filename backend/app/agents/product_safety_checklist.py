from app.models.analysis import ParsedIntent, ProductSafetyChecklist, SafetyChecklistItem


def build_product_safety_checklist(parsed_intent: ParsedIntent) -> ProductSafetyChecklist:
    combined = f"{parsed_intent.product_type} {parsed_intent.target_model}".lower()

    if "ps5" in combined or "playstation" in combined:
        items = [
            _item("Controller drift", "Test both controllers in-game before payment.", "high"),
            _item("Overheating", "Run a game for several minutes and listen for fan noise.", "high"),
            _item("Warranty and bill", "Verify bill date, serial number, and remaining warranty.", "high"),
            _item("HDMI port", "Inspect the port and test video output.", "medium"),
            _item("Disc drive", "If it is a disc edition, test a physical game.", "medium"),
            _item("Accessories", "Confirm controller, cables, stand, and included games.", "medium"),
        ]
    elif "macbook" in combined or "laptop" in combined:
        items = [
            _item("Battery cycle count", "Check cycle count and battery health in system information.", "high"),
            _item("MDM or activation lock", "Confirm it can be erased and activated without organization lock.", "high"),
            _item("Original charger", "Verify charger wattage and physical condition.", "medium"),
            _item("Keyboard and trackpad", "Test all keys, backlight, trackpad clicks, and gestures.", "medium"),
            _item("Display issues", "Check for dead pixels, bright spots, and hinge looseness.", "medium"),
            _item("Serial number", "Match serial number with bill and warranty lookup.", "high"),
            _item("Repair history", "Ask about display, battery, board, or liquid damage repairs.", "high"),
        ]
    elif "iphone" in combined or "phone" in combined or "mobile" in combined:
        items = [
            _item("Battery health", "Ask for a current battery health screenshot.", "high"),
            _item("IMEI verification", "Match IMEI with bill, box, and device settings.", "high"),
            _item("iCloud lock", "Confirm Find My iPhone is disabled before payment.", "high"),
            _item("Bill and box", "Prefer listings with original bill and matching box.", "medium"),
            _item("Warranty status", "Check warranty or Apple coverage where available.", "medium"),
            _item("Repair history", "Ask about display, battery, camera, or board replacements.", "high"),
            _item("Face ID", "Test Face ID setup and unlock during inspection.", "high"),
            _item("Display replacement", "Check True Tone, touch response, and display message warnings.", "medium"),
        ]
    else:
        items = [
            _item("Ownership proof", "Ask for bill, serial number, or proof of purchase.", "high"),
            _item("Hands-on test", "Inspect and test the product before payment.", "high"),
            _item("Condition photos", "Request clear photos of all sides and accessories.", "medium"),
            _item("No advance payment", "Avoid token or advance transfers before verification.", "high"),
        ]

    target = parsed_intent.target_model or parsed_intent.product_type
    return ProductSafetyChecklist(
        product_type=parsed_intent.product_type,
        target_model=target,
        checklist_items=items,
        summary=f"{target} inspection checklist with {len(items)} buyer safety checks.",
    )


def _item(label: str, reason: str, priority: str) -> SafetyChecklistItem:
    return SafetyChecklistItem(label=label, reason=reason, priority=priority)
