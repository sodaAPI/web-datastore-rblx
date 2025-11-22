# Update Issue - 404 Error

## Problem
All update methods (POST, PUT, PATCH) return 404 when trying to update existing entries, even though:
- ✅ GET works (we can read entries)
- ✅ The entry exists (we can see it)
- ✅ The URL format is correct
- ✅ The data format is correct

## Official Documentation Findings

Based on Roblox documentation research:

1. **Data Stores v2 APIs are in public beta** ([source](https://devforum.roblox.com/t/data-stores-v2-open-cloud-apis-are-now-in-public-beta/3075752))

2. **API Key Permissions Required:**
   - `universe-datastores.objects:read` (for reading)
   - `universe-datastores.objects:create` (for creating)
   - `universe-datastores.objects:update` (for updating)

   **Note:** The permission name is `universe-datastores.objects` (plural "objects"), not `universe-datastore.object` (singular).

3. **Official Documentation:**
   - [Roblox Open Cloud DataStore API](https://create.roblox.com/docs/cloud/datastores-api)
   - [Roblox Open Cloud API Reference](https://create.roblox.com/docs/cloud/reference)

4. **Data Format:**
   According to documentation, when setting a value, the request body should be:
   ```json
   {
     "value": "yourData"
   }
   ```
   However, we're sending the data directly. This might be the issue!

## Most Likely Issue: Data Format

The documentation suggests the request body should be:
```json
{
  "value": { "Checkpoints": 0, "Summits": 142 }
}
```

But we're currently sending:
```json
{ "Checkpoints": 0, "Summits": 142 }
```

## Possible Causes

### 1. Wrong Data Format (MOST LIKELY)
We might need to wrap the data in a `value` field.

### 2. API Key Permissions
Check for `universe-datastores.objects` (plural) with `update` permission.

**Check:**
1. Go to [Roblox Creator Dashboard - Credentials](https://create.roblox.com/dashboard/credentials)
2. Edit your API key
3. Look for **"universe-datastores.objects"** (plural)
4. Ensure `update` permission is checked
5. Click "Save"
6. Wait 1-2 minutes for changes to propagate

### 3. POST Only Works for Creates
The Roblox Cloud API v2 might only support POST for creating NEW entries, not updating existing ones.

**Test:**
1. Try creating a NEW entry with a User ID that doesn't exist (e.g., `999999999`)
2. Enter some JSON data: `{"test": "value"}`
3. Click "Create/Update"
4. If it works, POST works for creates but not updates

## Next Steps

1. **Try wrapping data in `value` field** - Update the code to send `{"value": data}` instead of just `data`
2. **Test creating a new entry** - Does POST work for creates?
3. **Check API permissions** - Look for `universe-datastores.objects` (plural) with `update` permission
4. **Check official docs** - [Roblox Open Cloud DataStore API Documentation](https://create.roblox.com/docs/cloud/datastores-api)

## References

- [Data Stores v2 Open Cloud APIs - Public Beta](https://devforum.roblox.com/t/data-stores-v2-open-cloud-apis-are-now-in-public-beta/3075752)
- [Roblox Open Cloud DataStore API Documentation](https://create.roblox.com/docs/cloud/datastores-api)
- [Roblox Open Cloud API Reference](https://create.roblox.com/docs/cloud/reference)
