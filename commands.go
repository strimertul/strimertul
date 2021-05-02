package main

import (
	"errors"
	"time"
)

var (
	ErrPAlreadyBet      error = errors.New("you already have a bet")
	ErrPNoPrediction    error = errors.New("there's nothing to bet for")
	ErrPBettingTimeOver error = errors.New("betting time is over")
)

type PredictionBet struct {
	Amount uint64
	Team   uint
}

type Prediction struct {
	Active   bool
	Deadline time.Time
	Bets     map[string]PredictionBet
	Teams    []string
}

func NewPrediction(teams []string, bettingTime time.Duration) *Prediction {
	return &Prediction{
		Active:   false,
		Deadline: time.Now().Add(bettingTime),
		Bets:     make(map[string]PredictionBet),
		Teams:    teams,
	}
}

func (p *Prediction) AddBet(who string, teamId uint, amount uint64) error {
	_, ok := p.Bets[who]
	if ok {
		return ErrPAlreadyBet
	}

	p.Bets[who] = PredictionBet{
		Amount: amount,
		Team:   teamId,
	}
	return nil
}
