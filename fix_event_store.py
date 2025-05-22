import re

# Path to the file
file_path = "backend/events/event_store.py"
fixed_file_path = "backend/events/event_store_fixed.py"

# Read the content of the file
with open(file_path, 'r', encoding='utf-8') as file:
    content = file.read()

# Fix the indentation in the 'Handle different time ranges' section
content = content.replace('        # Handle different time ranges', '    # Handle different time ranges')
content = content.replace('    if time_range == \'previous_week\':', 'if time_range == \'previous_week\':')
content = content.replace('        elif time_range == \'next_week\':', 'elif time_range == \'next_week\':')

# Fix the try-except block in save_events_to_cache function
content = content.replace('            except Exception as e:', '    except Exception as e:')

# Write the fixed content to a new file
with open(fixed_file_path, 'w', encoding='utf-8') as file:
    file.write(content)

print(f"Fixed file saved to {fixed_file_path}")
print("Use the following command to replace the original file:")
print(f"move /Y {fixed_file_path} {file_path}") 