# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


class NewsBlitz(gl.Contract):
    rooms: TreeMap[str, str]
    weekly_plays: TreeMap[str, u32]
    global_lb: TreeMap[str, str]   # key "data" → JSON array of all-time scores

    def __init__(self):
        pass

    @gl.public.write
    def create_room(self, room_id: str, topic: str) -> None:
        topic_labels = {
            "world":    "World News",
            "sports":   "Sports",
            "business": "Business",
        }
        rss_urls = {
            "world":    "https://feeds.bbci.co.uk/news/world/rss.xml",
            "sports":   "https://news.google.com/rss/search?q=sports+football+basketball+tennis+championship&hl=en&gl=US&ceid=US:en",
            "business": "https://news.google.com/rss/search?q=business+economy+stocks+market+finance&hl=en&gl=US&ceid=US:en",
        }
        assert topic in topic_labels, "Invalid topic"

        host = str(gl.message.sender_address)
        topic_label = topic_labels[topic]
        rss_url = rss_urls[topic]

        def leader_fn():
            response = gl.nondet.web.get(rss_url)
            rss_content = response.body.decode("utf-8", errors="replace")[:4000]
            prompt = (
                f"You are a trivia game master specializing in {topic_label}.\n"
                f"Read these {topic_label} news headlines and generate exactly 10 trivia questions STRICTLY about {topic_label}.\n\n"
                f"NEWS FEED:\n{rss_content}\n\n"
                f"Rules:\n"
                f"- ALL questions MUST be about {topic_label} ONLY\n"
                f"- Factual, short answers (1-5 words)\n"
                f"- 3 easy + 4 medium + 3 hard\n"
                f"- Base each question on a specific fact from the feed above\n\n"
                f'Respond ONLY with JSON: {{"topic_title": "{topic_label} Trivia", "questions": [{{"text": "...", "correct_answer": "...", "difficulty": "easy|medium|hard"}}]}}'
            )
            return gl.nondet.exec_prompt(prompt, response_format="json")

        def validator_fn(leader_result) -> bool:
            try:
                if isinstance(leader_result, Exception):
                    return False
                data = leader_result.calldata if hasattr(leader_result, "calldata") else leader_result
                qs = data.get("questions", [])
                return (
                    len(qs) >= 5
                    and isinstance(data.get("topic_title"), str)
                    and all("text" in q and "correct_answer" in q for q in qs)
                )
            except Exception:
                return False

        data = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        questions = data.get("questions", [])

        room = {
            "host":        host,
            "topic":       topic,
            "topic_title": f"{topic_label} Trivia",
            "questions":   questions,
            "players":     {},
            "status":      "waiting",
        }
        self.rooms[room_id] = json.dumps(room)

    @gl.public.write
    def join_room(self, room_id: str) -> None:
        room = self._get_room(room_id)
        player = str(gl.message.sender_address)
        assert room["status"] == "waiting", "Game already started"
        assert len(room["players"]) < 8, "Room full"
        assert player not in room["players"], "Already in room"
        room["players"][player] = {"score": 0, "answers": []}
        self.rooms[room_id] = json.dumps(room)

    @gl.public.write
    def start_game(self, room_id: str) -> None:
        room = self._get_room(room_id)
        assert str(gl.message.sender_address) == room["host"], "Only host can start"
        assert room["status"] == "waiting", "Already started"
        assert len(room["players"]) >= 1, "Need at least 1 player"
        room["status"] = "playing"
        self.rooms[room_id] = json.dumps(room)

    @gl.public.write
    def submit_answer(self, room_id: str, q_index: int, answer: str, time_ms: int) -> None:
        room = self._get_room(room_id)
        player = str(gl.message.sender_address)
        assert room["status"] == "playing", "Game not active"
        assert player in room["players"], "Not in room"
        assert 0 <= q_index < len(room["questions"]), "Invalid question"

        player_state = room["players"][player]
        already = any(a["q_index"] == q_index for a in player_state["answers"])
        assert not already, "Already answered"

        q = room["questions"][q_index]

        def leader_fn():
            prompt = (
                f"Question: {q['text']}\n"
                f"Correct answer: {q['correct_answer']}\n"
                f"Player answer: {answer}\n\n"
                "Is the player's answer correct? Accept synonyms, abbreviations, alternate spellings.\n"
                'Respond ONLY with JSON: {"correct": true_or_false}'
            )
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            return bool(result.get("correct", False))

        def validator_fn(leader_result) -> bool:
            try:
                if isinstance(leader_result, Exception):
                    return False
                actual = leader_result.calldata if hasattr(leader_result, "calldata") else leader_result
                my_result = leader_fn()
                return bool(my_result) == bool(actual)
            except Exception:
                return False

        is_correct = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        points = 0
        if is_correct:
            time_bonus = max(0, (15000 - min(time_ms, 15000)) // 150)
            diff_mult = {"easy": 1, "medium": 2, "hard": 3}.get(q.get("difficulty", "medium"), 2)
            points = (100 + time_bonus) * diff_mult

        player_state["score"] += points
        player_state["answers"].append({
            "q_index": q_index,
            "answer":  answer,
            "correct": is_correct,
            "points":  points,
            "time_ms": time_ms,
        })
        room["players"][player] = player_state
        self.rooms[room_id] = json.dumps(room)

    @gl.public.write
    def finish_game(self, room_id: str) -> None:
        room = self._get_room(room_id)
        assert str(gl.message.sender_address) == room["host"], "Only host can finish"
        assert room["status"] == "playing", "Game not active"
        room["status"] = "finished"
        self.rooms[room_id] = json.dumps(room)

        # Update weekly plays
        for addr in room["players"]:
            self.weekly_plays[f"{room_id}:{addr}"] = u32(1)

        # Update global leaderboard
        if "data" in self.global_lb:
            try:
                global_data = json.loads(self.global_lb["data"])
            except Exception:
                global_data = []
        else:
            global_data = []

        scores_dict = {entry["address"]: entry for entry in global_data}

        for addr, player_state in room["players"].items():
            game_score = player_state["score"]
            game_correct = sum(1 for a in player_state["answers"] if a["correct"])
            if addr in scores_dict:
                scores_dict[addr]["total_score"] += game_score
                scores_dict[addr]["games"] += 1
                scores_dict[addr]["total_correct"] += game_correct
            else:
                scores_dict[addr] = {
                    "address":       addr,
                    "total_score":   game_score,
                    "games":         1,
                    "total_correct": game_correct,
                }

        global_list = sorted(scores_dict.values(), key=lambda x: x["total_score"], reverse=True)[:50]
        self.global_lb["data"] = json.dumps(global_list)

    @gl.public.view
    def get_global_leaderboard(self) -> str:
        if "data" in self.global_lb:
            try:
                data = json.loads(self.global_lb["data"])
            except Exception:
                data = []
        else:
            data = []
        return json.dumps({"leaderboard": data, "total": len(data)})

    @gl.public.view
    def get_room_info(self, room_id: str) -> str:
        room = self._get_room(room_id)
        return json.dumps({
            "room_id":        room_id,
            "topic":          room["topic"],
            "topic_title":    room["topic_title"],
            "host":           room["host"],
            "status":         room["status"],
            "player_count":   len(room["players"]),
            "question_count": len(room["questions"]),
            "players":        list(room["players"].keys()),
        })

    @gl.public.view
    def get_question(self, room_id: str, q_index: int) -> str:
        room = self._get_room(room_id)
        assert 0 <= q_index < len(room["questions"]), "Invalid question index"
        q = room["questions"][q_index]
        result = {
            "index":      q_index,
            "total":      len(room["questions"]),
            "text":       q["text"],
            "difficulty": q.get("difficulty", "medium"),
        }
        if room["status"] == "finished":
            result["correct_answer"] = q["correct_answer"]
        return json.dumps(result)

    @gl.public.view
    def get_leaderboard(self, room_id: str) -> str:
        room = self._get_room(room_id)
        xp_rewards = [100, 60, 40, 25, 20, 15, 10, 10]
        players = [
            {"address": addr, **state}
            for addr, state in room["players"].items()
        ]
        players.sort(key=lambda p: p["score"], reverse=True)
        leaderboard = []
        for i, p in enumerate(players):
            correct = sum(1 for a in p["answers"] if a["correct"])
            leaderboard.append({
                "rank":      i + 1,
                "address":   p["address"],
                "score":     p["score"],
                "correct":   correct,
                "answered":  len(p["answers"]),
                "xp_earned": xp_rewards[i] if i < len(xp_rewards) else 5,
            })
        return json.dumps({
            "room_id":     room_id,
            "topic_title": room["topic_title"],
            "status":      room["status"],
            "leaderboard": leaderboard,
        })

    @gl.public.view
    def get_player_answer(self, room_id: str, player: str, q_index: int) -> str:
        room = self._get_room(room_id)
        player_state = room["players"].get(player)
        if not player_state:
            return json.dumps({"found": False})
        for a in player_state["answers"]:
            if a["q_index"] == q_index:
                return json.dumps({"found": True, **a})
        return json.dumps({"found": False})

    def _get_room(self, room_id: str) -> dict:
        assert room_id in self.rooms, f"Room '{room_id}' not found"
        return json.loads(self.rooms[room_id])
