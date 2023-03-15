"""
curl -X POST -H "Content-Type: application/json" -d '{"url": "https://localhost:5000/generate_image", "time_listened": 3600, "sol_spent": 1, "minted_at": "2023-03-07T14:30:00.000Z"}' http://localhost:5001/generate_image
"""
import io
import json
import textwrap
import time

import firebase_admin
import qrcode
import tweepy
from PIL import Image, ImageDraw, ImageFont
from firebase_admin import credentials, storage, firestore
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS

# Use a service account.
cred = ""

try:
    cred = credentials.Certificate('./creds/firebase-creds.json')
except Exception as e:
    print("Could not load credentials." + str(e))
    exit()

app = firebase_admin.initialize_app(cred, {
    'storageBucket': 'hackathon2023-821e7.appspot.com'
})

db = firestore.client()
bucket = storage.bucket()

# doc_ref = db.collection(u'users').document(u'alovelace')
# doc_ref.set({
#     u'first': u'Ada',
#     u'last': u'Lovelace',
#     u'born': 1815
# })
# print('Message posted successfully!')

notion_page = "https://www.notion.so/blueberrychopsticks/Proof-of-Listening-a1c08469340349608c8e6a9f1e40bdf6?pvs=4"

app = Flask(__name__)
CORS(app)


@app.route('/generate_metadata', methods=['POST'])
def generate_metadata():
    # Get JSON from request body
    data = request.get_json()
    video_url = data['video_url']
    current_nft_index = data['current_nft_index']
    sol_spent = data['sol_spent']
    minted_at = data['minted_at']
    listen_start = data['listen_start']
    listen_end = data['listen_end']
    time_listened = listen_end - listen_start

    # Generate image
    image_url = generate_image(data)

    clip_deeplink = f"{video_url}?t={listen_start}"

    # Pad the current NFT index to 4 digits
    current_nft_index = str(current_nft_index).zfill(4)

    name = f"LOL {current_nft_index}"
    symbol = "LOLABC"
    description = "Superior methodology for monetization of long form content"
    image = image_url
    external_url = notion_page
    attributes = [
        {
            "trait_type": "clip deeplink",
            "value": clip_deeplink
        },
        {
            "trait_type": "cost",
            "value": sol_spent
        },
        {
            "trait_type": "mint date",
            "value": minted_at
        },
    ]
    collection = {
        "name": "LOLABC",
        "family": "LOLABC"
    }

    nft_json_metadata = {
        "name": name,
        "symbol": symbol,
        "description": description,
        "image": image,
        "external_url": external_url,
        "attributes": attributes,
        "collection": collection
    }

    # convert the JSON data to a string
    json_string = json.dumps(nft_json_metadata)

    json_file_name = f"metadata_{name}.json"

    # create a blob with a unique filename
    blob = bucket.blob(json_file_name)

    # upload the JSON data to Firebase Storage
    blob.upload_from_string(json_string, content_type='application/json')

    # make the file public
    blob.make_public()

    # get the public URL of the uploaded file
    json_metadata_url = blob.public_url

    return jsonify({'url': json_metadata_url, "image_url": image_url})


# @app.route('/generate_image', methods=['POST'])
def generate_image(data):
    print(data)
    video_url = data['video_url']
    sol_spent = data['sol_spent']
    minted_at = data['minted_at']
    listen_start = data['listen_start']
    listen_end = data['listen_end']
    time_listened = listen_end - listen_start

    clip_deeplink = f"{video_url}?t={listen_start}"

    # Generate QR code image
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(notion_page)
    qr.make(fit=True)
    qr_image = qr.make_image(fill_color="black", back_color="white")

    # Generate text image
    text = f"I listened to {clip_deeplink} for {time_listened} seconds and spent {sol_spent}SOL on this NFT. \n\nI " \
           f"minted on {minted_at} \n\nThe price doubles every time anyone mints from this video. \n\nThe creator " \
           f"gets a share.\nI get a share.\nThe DAO gets a share.\n\nFind out more."
    wrapped_text = textwrap.fill(text, width=50)

    font = ImageFont.truetype('/Library/Fonts/Arial.ttf', 24)
    text_image = Image.new('RGB', (631, 631), color='pink')
    draw = ImageDraw.Draw(text_image)
    draw.text((10, 10), wrapped_text, font=font, fill='black')

    # Add QR code to text image
    qr_size = qr_image.size[0]
    text_image.paste(qr_image, (315 - qr_size // 2, 190))

    image_io = io.BytesIO()
    text_image.save(image_io, 'PNG')

    # Create response with image data
    response = make_response(image_io.getvalue())

    response.headers.set('Content-Type', 'image/png')
    response.headers.set('Content-Disposition', 'inline')

    # Upload image to Firebase Storage
    timestamp = str(int(time.time()))
    filename = f'image_{timestamp}.png'
    blob = bucket.blob(filename)
    blob.upload_from_string(image_io.getvalue(), content_type='image/png')
    blob.make_public()

    # image_io.seek(0)
    # blob = bucket.blob(filename)
    # blob.upload_from_file(image_io, predefined_acl="public-read")

    # Get public URL of uploaded image
    video_url = blob.public_url

    # Return URL
    return video_url


# @app.route('/create_tweet', methods=['POST'])
def create_tweet():
    '''
    Create a tweet given a text body and a user to @ mention

    Parameters
    ----------
    text: str
        The text body of the tweet
    user: str
        The user to @ mention in the tweet

    Returns
    -------
    url: str
        The URL of the created tweet
    '''

    # * Get the request body
    params = request.json

    # ! Check if the we got the correct keys
    if ('text' not in params or 'user' not in params):
        return jsonify({'error': 'Missing Parameters'}), 400

        # ! Check the type of the keys
    if (type(params['text']) != str or type(params['user']) != str):
        return jsonify({'error': 'Invalid Parameter Type'}), 400

    # * Make sure to params has the correct keys
    text = params['text']
    user = params['user']

    # ! Load Creds from a file
    # ! Make sure to add your own creds file
    creds = ""

    try:
        creds = json.load(open('./creds/twitter-creds.json'))
    except Exception as e:
        print("Could not load credentials." + str(e))
        return jsonify({'error': 'Could not load credentials.'}), 500

    # ! Set up the API
    try:
        auth = tweepy.OAuthHandler(creds['API_KEY'], creds['API_SECRET_KEY'])
        auth.set_access_token(creds['ACCESS_TOKEN'], creds['ACCESS_TOKEN_SECRET'])
        api = tweepy.API(auth)

        tweet = api.update_status(f'@{user} {text}')

        # ! Get the latest tweet
        tweet_user = api.get_user(screen_name=creds['USER_NAME'])
        tweet = api.user_timeline(screen_name=tweet_user.screen_name, count=1)[0]

        # * Return the URL of the tweet
        return jsonify({'url': f'https://twitter.com/{tweet_user.screen_name}/status/{tweet.id}'})
    except Exception as e:
        print("Could not create tweet." + str(e))
        return jsonify({'error': 'Could not create tweet.'}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5001)
