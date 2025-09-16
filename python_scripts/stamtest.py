test_input = ["9000 app.komodor.com", "100 google.com", "100 core.komodor.com"]

from collections import defaultdict

order_counts = defaultdict(int)

def process_domains(input):
    domain_map = defaultdict(int)
    for inp in input:
        count = int(inp.split(" ")[0])
        fulldom = inp.split(" ")[1]
        parts = fulldom.split(".")


        for i in range(len(parts)-1, -1 , -1):
            domain_map[  ".".join(parts[i:len(parts)])] +=  count

    return domain_map

print(process_domains(test_input))