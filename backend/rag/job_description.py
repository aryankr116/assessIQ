"""Extract interview skills and experience requirements from job descriptions."""

from __future__ import annotations

import re
from typing import Optional


_SKILL_TERMS = (
    ("JavaScript", "JavaScript"),
    ("TypeScript", "TypeScript"),
    ("Python", "Python"),
    ("Java", "Java"),
    ("C++", "C++"),
    ("C#", "C#"),
    ("Go", "Go"),
    ("Golang", "Go"),
    ("Rust", "Rust"),
    ("Ruby", "Ruby"),
    ("PHP", "PHP"),
    ("Swift", "Swift"),
    ("Kotlin", "Kotlin"),
    ("Scala", "Scala"),
    ("SQL", "SQL"),
    ("data structures and algorithms", "Data structures and algorithms"),
    ("data structures", "Data structures"),
    ("algorithms", "Algorithms"),
    ("DSA", "Data structures and algorithms"),
    ("database management systems", "Database management systems"),
    ("DBMS", "Database management systems"),
    ("object-oriented programming", "Object-oriented programming"),
    ("OOP", "Object-oriented programming"),
    ("Bash", "Bash"),
    ("Shell scripting", "Shell scripting"),
    ("React", "React"),
    ("Angular", "Angular"),
    ("Vue.js", "Vue.js"),
    ("Node.js", "Node.js"),
    ("Express.js", "Express.js"),
    ("Django", "Django"),
    ("Flask", "Flask"),
    ("FastAPI", "FastAPI"),
    ("Spring Boot", "Spring Boot"),
    ("Spring", "Spring"),
    ("ASP.NET", "ASP.NET"),
    (".NET", ".NET"),
    ("Laravel", "Laravel"),
    ("Ruby on Rails", "Ruby on Rails"),
    ("REST APIs", "REST APIs"),
    ("GraphQL", "GraphQL"),
    ("microservices", "Microservices"),
    ("distributed systems", "Distributed systems"),
    ("system design", "System design"),
    ("event-driven architecture", "Event-driven architecture"),
    ("PostgreSQL", "PostgreSQL"),
    ("MySQL", "MySQL"),
    ("MongoDB", "MongoDB"),
    ("Redis", "Redis"),
    ("Elasticsearch", "Elasticsearch"),
    ("DynamoDB", "DynamoDB"),
    ("Cassandra", "Cassandra"),
    ("SQLite", "SQLite"),
    ("SQL Server", "SQL Server"),
    ("Oracle", "Oracle"),
    ("AWS", "AWS"),
    ("Amazon Web Services", "AWS"),
    ("Azure", "Azure"),
    ("GCP", "Google Cloud"),
    ("Google Cloud", "Google Cloud"),
    ("Docker", "Docker"),
    ("Kubernetes", "Kubernetes"),
    ("Terraform", "Terraform"),
    ("CI/CD", "CI/CD"),
    ("Jenkins", "Jenkins"),
    ("GitHub Actions", "GitHub Actions"),
    ("Git", "Git"),
    ("Linux", "Linux"),
    ("machine learning", "Machine learning"),
    ("deep learning", "Deep learning"),
    ("data engineering", "Data engineering"),
    ("Apache Spark", "Apache Spark"),
    ("Kafka", "Kafka"),
    ("Airflow", "Airflow"),
    ("pandas", "pandas"),
    ("NumPy", "NumPy"),
    ("TensorFlow", "TensorFlow"),
    ("PyTorch", "PyTorch"),
    ("natural language processing", "Natural language processing"),
    ("artificial intelligence", "Artificial intelligence"),
    ("generative AI", "Generative AI"),
    ("large language models", "Large language models"),
    ("RAG", "Retrieval-augmented generation"),
    ("cybersecurity", "Cybersecurity"),
    ("OAuth", "OAuth"),
    ("JWT", "JWT"),
    ("unit testing", "Unit testing"),
    ("integration testing", "Integration testing"),
    ("test automation", "Test automation"),
    ("Selenium", "Selenium"),
    ("Cypress", "Cypress"),
    ("Playwright", "Playwright"),
    ("HTML", "HTML"),
    ("CSS", "CSS"),
    ("communication", "Communication"),
    ("leadership", "Leadership"),
    ("problem solving", "Problem solving"),
    ("project management", "Project management"),
    ("customer service", "Customer service"),
    ("sales", "Sales"),
    ("food safety", "Food safety"),
    ("food preparation", "Food preparation"),
    ("culinary arts", "Culinary arts"),
    ("menu planning", "Menu planning"),
    ("kitchen management", "Kitchen management"),
    ("knife skills", "Knife skills"),
    ("baking", "Baking"),
    ("cooking", "Cooking"),
    ("nutrition", "Nutrition"),
    ("curriculum design", "Curriculum design"),
    ("classroom management", "Classroom management"),
)


def extract_skills(text: str) -> list[str]:
    """Return recognized skills in the order they appear, without duplicates."""
    matches = []
    for term, canonical in _SKILL_TERMS:
        flags = 0 if term == "Go" else re.IGNORECASE
        for match in re.finditer(rf"(?<!\w){re.escape(term)}(?!\w)", text, flags):
            matches.append((match.start(), -(match.end() - match.start()), canonical))

    skills = []
    seen = set()
    occupied_until = -1
    for start, negative_length, canonical in sorted(matches):
        end = start - negative_length
        if start < occupied_until or canonical.casefold() in seen:
            continue
        skills.append(canonical)
        seen.add(canonical.casefold())
        occupied_until = end
    return skills


def extract_experience_requirement(text: str) -> tuple[Optional[str], Optional[str]]:
    """Return a readable years requirement and difficulty calibration."""
    number = r"\d+(?:\.\d+)?"
    experience = r"(?:relevant |professional |hands-on |work )?experience"
    minimum = re.search(
        rf"(?P<qualifier>at least|minimum(?: of)?|more than|over)\s+(?P<low>{number})"
        rf"\s*(?:years?|yrs?)\s*(?:of\s+|'\s*)?{experience}",
        text,
        re.IGNORECASE,
    )
    if minimum:
        years = float(minimum.group("low"))
        qualifier = minimum.group("qualifier").lower()
        if qualifier in ("more than", "over"):
            years = years + 1 if years.is_integer() else years + 0.1
        requirement = f"{_format_years(years)}+ years"
        level = _experience_level(years)
        return requirement, level

    patterns = (
        rf"(?P<low>{number})\s*(?:-|–|—|to)\s*(?P<high>{number})\s*\+?\s*(?:years?|yrs?)\s*(?:of\s+|'\s*)?{experience}",
        rf"(?P<low>{number})\s*\+\s*(?:years?|yrs?)\s*(?:of\s+|'\s*)?{experience}",
        rf"(?P<low>{number})\s*(?:years?|yrs?)\s*(?:of\s+|'\s*)?{experience}",
        rf"{experience}\s*(?:required\s*)?[:\-]?\s*(?P<low>{number})\s*(?:-|–|—|to)\s*(?P<high>{number})\s*\+?\s*(?:years?|yrs?)",
        rf"{experience}\s*(?:required\s*)?[:\-]?\s*(?P<low>{number})\s*\+\s*(?:years?|yrs?)",
        rf"{experience}\s*(?:required\s*)?[:\-]?\s*(?P<low>{number})\s*(?:years?|yrs?)",
    )

    for index, pattern in enumerate(patterns):
        match = re.search(pattern, text, re.IGNORECASE)
        if not match:
            continue

        low = float(match.group("low"))
        high = float(match.groupdict().get("high") or low)
        if index in (0, 3):
            requirement = f"{_format_years(low)}-{_format_years(high)} years"
        elif index in (1, 4):
            requirement = f"{_format_years(low)}+ years"
        else:
            unit = "year" if low == 1 else "years"
            requirement = f"{_format_years(low)} {unit}"

        level = experience_difficulty_level(requirement)
        return requirement, level

    return None, None


def experience_difficulty_level(requirement: Optional[str]) -> Optional[str]:
    """Derive a difficulty band from a saved experience requirement."""
    if not requirement:
        return None

    match = re.search(
        r"(?P<low>\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*"
        r"(?P<high>\d+(?:\.\d+)?)",
        requirement,
        re.IGNORECASE,
    )
    if match:
        years = float(match.group("high"))
    else:
        match = re.search(r"\d+(?:\.\d+)?", requirement)
        if not match:
            return None
        years = float(match.group())
    return _experience_level(years)


def _experience_level(years: float) -> str:
    if years >= 6:
        return "advanced"
    if years >= 3:
        return "intermediate"
    return "beginner"


def _format_years(value: float) -> str:
    return str(int(value)) if value.is_integer() else str(value)
