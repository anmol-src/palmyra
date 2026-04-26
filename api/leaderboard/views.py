import json
import re

from django.core.cache import cache
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .models import Score


CALLSIGN_RE = re.compile(r'[^a-zA-Z0-9 ]')
RATE_LIMIT_SECONDS = 10


def _client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _sanitize_callsign(raw):
    if not isinstance(raw, str):
        return 'Unknown'
    cleaned = CALLSIGN_RE.sub('', raw).strip()
    if not cleaned:
        return 'Unknown'
    return cleaned[:20]


@csrf_exempt
@require_POST
def submit_score(request):
    ip = _client_ip(request)
    cache_key = f'rl:score:{ip}'
    if cache.get(cache_key):
        return JsonResponse({'error': 'rate_limited'}, status=429)

    try:
        body = json.loads(request.body.decode('utf-8') or '{}')
    except (ValueError, UnicodeDecodeError):
        return HttpResponseBadRequest('invalid json')

    try:
        score = int(body.get('score'))
        level = int(body.get('level'))
    except (TypeError, ValueError):
        return HttpResponseBadRequest('invalid score/level')

    if score < 0 or score >= 10_000_000:
        return HttpResponseBadRequest('score out of range')
    if level < 1 or level > 50:
        return HttpResponseBadRequest('level out of range')

    callsign = _sanitize_callsign(body.get('callsign'))

    cache.set(cache_key, 1, RATE_LIMIT_SECONDS)

    entry = Score.objects.create(
        callsign=callsign,
        score=score,
        level=level,
        ip_address=ip,
    )

    rank = Score.objects.filter(score__gt=score).count() + 1

    return JsonResponse({
        'rank': rank,
        'callsign': entry.callsign,
        'score': entry.score,
    })


@require_GET
def get_leaderboard(request):
    rows = Score.objects.all()[:100]
    leaderboard = [
        {
            'rank': i + 1,
            'callsign': row.callsign,
            'score': row.score,
            'level': row.level,
        }
        for i, row in enumerate(rows)
    ]
    return JsonResponse({'leaderboard': leaderboard})
