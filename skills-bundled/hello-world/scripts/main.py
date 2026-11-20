import json, sys, os

def main():
    args = {}
    try:
        args = json.loads(os.environ.get('SKILL_ARGS', '{}'))
    except Exception:
        try:
            data = sys.stdin.read()
            if data.strip():
                args = json.loads(data)
        except Exception:
            args = {}
    name = args.get('name', 'world')
    print(f"Hello, {name}!")

if __name__ == '__main__':
    main()
