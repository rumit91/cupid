# Cupid

A bot that posts photos and special messages to a Facebook group. 

## Introduction
I created this bot as a gift for my girlfriend on Valentine's Day 2016. It goes through all of my pictures on facebook and catalogs the photos where both of us are tagged. Then, starting Feb 4th, the bot posts 5 photos a day from that set with a random caption chosen from a hard-coded set of phrases. The bot also posts one special message per day taken from a set of hard-coded messages found in an external json file. These photos and messages are posted to a secret group on facebook that my girlfriend and I share.

## Implementation
This bot relies on the following tech:
- Node.js Express server
- Azure Blob Store for simple persistent storage
- Azure Web Jobs for scheduling posts
- Facebook's node js sdk - https://www.npmjs.com/package/fb
- Google's URL shortner - https://developers.google.com/url-shortener/
- Written in Typescript
